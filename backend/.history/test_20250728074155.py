import os
import json
import tempfile
import base64
import pandas as pd
from dash import Dash, dcc, html, Input, Output, State, ctx, dash_table
import dash_bootstrap_components as dbc
from scrapegraphai.graphs import SmartScraperGraph
from langchain_ollama import OllamaLLM

# ------------------ CONFIGURATION ------------------
PROMPT = """
You are an expert in extracting structured macroeconomic KPIs from national statistics reports.
Extract the following quantitative indicators from the PDF report, preferably for the years 2018 to 2025:
[...]
Return them as a list of JSON objects with the following format:
[{ "company": "ExtractedName", "kpi": "StandardizedName", "value": 1234567, "unit": "USD|EUR|%|TND", "year": 2023, "page": 42, "source": "Table 3.2" }]
"""

graph_config = {
    "llm": {
        "model": "mistral",
        "base_url": "http://localhost:11434"
    },
    "verbose": True
}

def extract_kpis_from_file(file_path):
    graph = SmartScraperGraph(prompt=PROMPT, config=graph_config, source=file_path)
    return graph.run()

# ------------------ APP ------------------
app = Dash(__name__, external_stylesheets=[dbc.themes.FLATLY])
app.title = "KPIs Extractor"

app.layout = dbc.Container([
    html.H2("📊 Extraction de KPIs macroéconomiques depuis PDF", className="mt-4 mb-4"),

    dcc.Upload(
        id='upload-pdf',
        children=html.Div(['Glissez-déposez ou ', html.A('sélectionnez vos fichiers PDF')]),
        style={
            'width': '100%', 'height': '80px', 'lineHeight': '80px',
            'borderWidth': '1px', 'borderStyle': 'dashed', 'borderRadius': '5px',
            'textAlign': 'center', 'marginBottom': '20px'
        },
        multiple=True,
        accept=".pdf"
    ),

    html.Div(id='file-list'),
    html.Hr(),
    html.Div(id='result-display')
], fluid=True)

# ------------------ CALLBACKS ------------------
@app.callback(
    Output('file-list', 'children'),
    Output('result-display', 'children'),
    Input('upload-pdf', 'contents'),
    State('upload-pdf', 'filename')
)
def handle_upload(contents, filenames):
    if contents is None:
        return "", ""

    results_ui = []
    file_ui = html.Ul([html.Li(name) for name in filenames])

    for content, filename in zip(contents, filenames):
        try:
            content_type, content_string = content.split(',')
            decoded = base64.b64decode(content_string)

            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(decoded)
                tmp_path = tmp.name

            data = extract_kpis_from_file(tmp_path)
            df = pd.DataFrame(data)

            table = dash_table.DataTable(
                columns=[{"name": col, "id": col} for col in df.columns],
                data=df.to_dict('records'),
                page_size=15,
                style_table={'overflowX': 'auto'},
                style_cell={"textAlign": "left", "padding": "5px"},
                style_header={"backgroundColor": "#007BFF", "color": "white"}
            )

            json_str = json.dumps(data, indent=2, ensure_ascii=False)
            download_json = html.A("📥 Télécharger JSON", download=f"{filename}_kpis.json", href="data:application/json;base64," + base64.b64encode(json_str.encode()).decode(), target="_blank")

            results_ui.append(html.Div([
                html.H5(f"📄 Résultats pour : {filename}"),
                table,
                html.Pre(json_str, style={"backgroundColor": "#f8f9fa", "padding": "10px"}),
                download_json,
                html.Hr()
            ]))

            os.remove(tmp_path)

        except Exception as e:
            results_ui.append(html.Div([html.H5(f"Erreur avec {filename}"), html.Pre(str(e))]))

    return file_ui, results_ui

# ------------------ RUN ------------------
if __name__ == '__main__':
    app.run_server(debug=True)
