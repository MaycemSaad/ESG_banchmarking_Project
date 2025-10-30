import os
import json
import base64
import tempfile
import logging
import pandas as pd
from dash import Dash, dcc, html, Input, Output, State, ctx, dash_table
import dash_bootstrap_components as dbc
from scrapegraphai.graphs import SmartScraperGraph
from langchain_ollama import OllamaLLM

# ------------------ CONFIGURATION ------------------
logging.basicConfig(level=logging.INFO)

PROMPT = """
You are an expert ESG analyst extracting key performance indicators from sustainability reports.

Extract the following ESG KPIs from the document, focusing on high-priority (A+ Critical) metrics:
1. Environmental Indicators:
   - Greenhouse gas emissions (Scope 1, 2, 3)
   - Air/water pollution metrics
   - Waste management statistics
   - Energy efficiency metrics

2. Social Indicators:
   - Labor conditions in supply chain
   - Product safety incidents
   - Clinical trial safety metrics
   - Food safety violations

3. Governance Indicators:
   - Supplier compliance rates
   - Counterfeit detection metrics
   - Data privacy compliance

Return them as a list of JSON objects with this exact format:
[
  {
    "kpi_name": "Tier 1 Supplier Wastewater Compliance Rate",
    "topic": "Environmental Impacts in the Supply Chain",
    "score": "A - High",
    "criticality": "A+ - Critical",
    "value": 98.5,
    "unit": "%",
    "year": 2023,
    "source": "Company Sustainability Report 2023, page 45"
  }
]

Only include quantitative metrics with clear values and units. Skip qualitative descriptions.
"""

graph_config = {
    "llm": {
        "model": "mistral",
        "base_url": "http://localhost:11434",
        "temperature": 0.1  # More deterministic output for numerical data
    },
    "verbose": True
}

def extract_kpis_from_file(file_path):
    graph = SmartScraperGraph(
        prompt=PROMPT, 
        config=graph_config, 
        source=file_path
    )
    return graph.run()

# ------------------ DATA PROCESSING ------------------
def process_esg_data(df):
    """Enhance the raw ESG KPI data with additional metadata"""
    df['criticality'] = df['score'].apply(
        lambda x: 'Critical' if 'A+' in x else 'High' if 'A' in x else 'Medium'
    )
    return df

# ------------------ APP INIT ------------------
app = Dash(__name__, external_stylesheets=[dbc.themes.FLATLY])
app.title = "ESG KPI Extractor"

app.layout = dbc.Container([
    html.H1("🌱 ESG KPI Extraction Tool", className="mt-4 mb-4 text-center"),
    html.P("Upload sustainability reports to extract critical ESG performance indicators", 
          className="text-muted text-center mb-4"),
    
    dbc.Row([
        dbc.Col([
            dcc.Upload(
                id='upload-file',
                children=html.Div([
                    html.I(className="bi bi-file-earmark-pdf fs-1"),
                    html.P("Drag & drop reports or click to browse", className="mt-2")
                ]),
                className="upload-box text-center p-4",
                multiple=True,
                accept=".pdf,.csv,.xlsx"
            ),
        ], width=12)
    ]),
    
    dbc.Row([
        dbc.Col([
            html.Div(id='file-list', className="mt-3")
        ], width=6),
        
        dbc.Col([
            dbc.Card([
                dbc.CardHeader("ESG KPI Reference Database"),
                dbc.CardBody([
                    dcc.Dropdown(
                        id='topic-filter',
                        options=[
                            {'label': 'All Topics', 'value': 'all'},
                            {'label': 'Supply Chain', 'value': 'supply_chain'},
                            {'label': 'Product Safety', 'value': 'product_safety'},
                            {'label': 'Emissions', 'value': 'emissions'}
                        ],
                        value='all'
                    ),
                    html.Div(id='kpi-reference-table', className="mt-3")
                ])
            ])
        ], width=6)
    ]),
    
    html.Hr(),
    
    dcc.Loading(
        id="loading-results",
        type="circle",
        children=html.Div(id='result-display', className="mt-4")
    ),
    
    dcc.Store(id='kpi-database', data=pd.read_csv('esg_kpis_A+_critical.csv').to_dict('records'))
], fluid=True)

# ------------------ CALLBACKS ------------------
@app.callback(
    Output('file-list', 'children'),
    Output('result-display', 'children'),
    Output('kpi-reference-table', 'children'),
    Input('upload-file', 'contents'),
    Input('topic-filter', 'value'),
    State('upload-file', 'filename'),
    State('kpi-database', 'data')
)
def handle_upload(contents, topic_filter, filenames, kpi_data):
    triggered_id = ctx.triggered_id
    
    if triggered_id == 'topic-filter':
        # Filter the KPI reference database
        df = pd.DataFrame(kpi_data)
        if topic_filter != 'all':
            df = df[df['topic'].str.contains(topic_filter, case=False)]
            
        table = dash_table.DataTable(
            columns=[{"name": col, "id": col} for col in ['kpi_name', 'topic', 'score']],
            data=df.to_dict('records'),
            page_size=10,
            style_table={'overflowX': 'auto'},
            style_cell={'textAlign': 'left', 'padding': '8px'},
            style_header={'backgroundColor': '#2c3e50', 'color': 'white'}
        )
        return None, None, table
    
    if not contents:
        return None, None, None
        
    results_ui = []
    file_ui = html.Ul([html.Li(name, className="mb-1") for name in filenames])
    
    for content, filename in zip(contents, filenames):
        try:
            content_type, content_string = content.split(',')
            decoded = base64.b64decode(content_string)
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(decoded)
                tmp_path = tmp.name
                
            # Extract KPIs from document
            extracted_data = extract_kpis_from_file(tmp_path)
            os.remove(tmp_path)
            
            if not extracted_data:
                raise ValueError("No ESG KPIs found in document")
                
            df = pd.DataFrame(extracted_data)
            
            # Enhanced visualization
            tabs = dbc.Tabs([
                dbc.Tab(
                    dash_table.DataTable(
                        columns=[{"name": col, "id": col} for col in df.columns],
                        data=df.to_dict('records'),
                        page_size=10,
                        style_table={'overflowX': 'auto'},
                        style_cell={'textAlign': 'left', 'padding': '8px'},
                        style_header={'backgroundColor': '#27ae60', 'color': 'white'},
                        filter_action="native",
                        sort_action="native"
                    ),
                    label="Table View"
                ),
                dbc.Tab(
                    html.Pre(
                        json.dumps(extracted_data, indent=2),
                        style={'height': '400px', 'overflowY': 'scroll'}
                    ),
                    label="Raw JSON"
                )
            ])
            
            download_btn = dbc.Button(
                "Download JSON",
                color="success",
                className="mt-3",
                href=f"data:application/json;base64,{base64.b64encodejson.dumps(extracted_data).decode()}"
            )
            
            results_ui.append(
                dbc.Card([
                    dbc.CardHeader(f"Results: {filename}"),
                    dbc.CardBody([tabs, download_btn])
                ], className="mb-4")
            )
            
        except Exception as e:
            results_ui.append(
                dbc.Alert(
                    f"Error processing {filename}: {str(e)}",
                    color="danger"
                )
            )
    
    return file_ui, results_ui, None

# ------------------ RUN ------------------
if __name__ == '__main__':
    app.run(debug=True, port=8051)