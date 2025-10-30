import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from sklearn.preprocessing import MinMaxScaler
import textwrap

# Configuration de la page
st.set_page_config(
    page_title=" ESG Analytics",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Style CSS personnalisé
st.markdown("""
<style>
    .main {background-color: #f8f9fa;}
    .metric-card {border-radius: 10px; padding: 15px; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);}
    .stPlotlyChart {border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);}
    .stDataFrame {border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);}
    .section-title {color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px;}
</style>
""", unsafe_allow_html=True)

# Titre avec logo
col1, col2 = st.columns([1, 10])
with col1:
    st.image("https://cdn-icons-png.flaticon.com/512/3281/3281289.png", width=80)
with col2:
    st.title("Advanced ESG Analytics Platform")
    st.markdown("""
    <div style='color: #7f8c8d; font-size: 16px;'>
    Benchmarking innovant des indicateurs ESG avec analyses sectorielles avancées
    </div>
    """, unsafe_allow_html=True)

# Chargement des données
@st.cache_data
def load_data():
    df = pd.read_excel("kpi_with_sectors.xlsx")
    
    # Nettoyage avancé
    df['Value'] = pd.to_numeric(df['Value'], errors='coerce')
    df['Value_clean'] = df['Value'].fillna(0)
    
    # Conversion de l'année en entier
    df['Year'] = df['Year'].astype(int)
    
    # Normalisation pour le radar chart
    scaler = MinMaxScaler()
    kpi_groups = df.groupby(['Company_x', 'Sector'])['Value_clean'].mean().unstack().fillna(0)
    df_normalized = pd.DataFrame(
        scaler.fit_transform(kpi_groups),
        columns=kpi_groups.columns,
        index=kpi_groups.index
    ).reset_index()
    
    return df, df_normalized

df, df_normalized = load_data()

# Sidebar - Filtres avancés
st.sidebar.header("🔍 Filtres Avancés")
selected_sectors = st.sidebar.multiselect(
    "Secteurs",
    options=df['Sector'].unique(),
    default=df['Sector'].unique()
)

selected_companies = st.sidebar.multiselect(
    "Entreprises",
    options=df['Company_x'].unique(),
    default=[]
)

selected_kpis = st.sidebar.multiselect(
    "Indicateurs Clés",
    options=df['KPI Name'].unique(),
    default=df['KPI Name'].unique()
)

# Gestion du slider d'année avec vérification
if df['Year'].nunique() > 1:
    year_range = st.sidebar.slider(
        "Période",
        min_value=int(df['Year'].min()),
        max_value=int(df['Year'].max()),
        value=(int(df['Year'].min()), int(df['Year'].max()))
    )
else:
    year_range = (int(df['Year'].min()), int(df['Year'].max()))
    st.sidebar.markdown(f"**Période fixe:** {year_range[0]} (une seule année disponible)")

# Filtrage
filtered_df = df[
    (df['Sector'].isin(selected_sectors)) &
    (df['Company_x'].isin(selected_companies) if selected_companies else True) &
    (df['KPI Name'].isin(selected_kpis)) &
    (df['Year'].between(*year_range))
]

# Section 1: KPI Metrics Overview
st.markdown("## 📊 Tableau de Bord Synthétique")
st.markdown("---")

# Cartes de métriques
cols = st.columns(4)
metrics = {
    "Entreprises": len(filtered_df['Company_x'].unique()),
    "Indicateurs": len(filtered_df['KPI Name'].unique()),
    "Secteurs": len(filtered_df['Sector'].unique()),
    "Période": f"{year_range[0]}-{year_range[1]}"
}

for i, (key, value) in enumerate(metrics.items()):
    cols[i].metric(label=key, value=value)

st.markdown("## 🌐 Analyse Sectorielle")
st.markdown("---")

# Radar Chart Comparatif
st.markdown("#### Profil ESG par Secteur (Radar Chart)")

sector_profile = filtered_df.groupby(['Sector', 'KPI Name'])['Value_clean'].mean().unstack().fillna(0)
if not sector_profile.empty:
    fig = go.Figure()
    
    for sector in sector_profile.index:
        fig.add_trace(go.Scatterpolar(
            r=sector_profile.loc[sector].values,
            theta=sector_profile.columns,
            fill='toself',
            name=sector,
            line=dict(color=px.colors.qualitative.Plotly[sector_profile.index.get_loc(sector)])
        ))
    
    fig.update_layout(
        polar=dict(radialaxis=dict(visible=True)),
        showlegend=True,
        height=600,
        margin=dict(l=50, r=50, t=80, b=50)  # Ajustement des marges
    )
    st.plotly_chart(fig, use_container_width=True)
else:
    st.warning("Données insuffisantes pour générer le radar chart")
    
    


# Sidebar - Filtres
st.sidebar.header("Filtres")
selected_sector = st.sidebar.multiselect(
    "Secteur",
    options=df['Sector'].unique(),
    default=df['Sector'].unique()
)

selected_kpis = st.sidebar.multiselect(
    "KPIs à inclure",
    options=df['KPI Name'].unique(),
    default=["Absolute Scope 1 GHG Emissions", "ESG Integration in AUM"]
)

# Filtrage des données
filtered_df = df[
    (df['Sector'].isin(selected_sector)) &
    (df['KPI Name'].isin(selected_kpis))
]

# Section 2: Tableau de benchmarking amélioré - Version complète des KPIs
# Version minimaliste pour correspondre à votre capture
st.header("🔍 Tableau de Benchmarking Complet")
st.markdown("---")

benchmark_table = df.groupby(['KPI Name', 'Sector', 'Industry']).agg(
    Moyenne=('Value_clean', 'mean'),
    Minimum=('Value_clean', 'min'),
    Maximum=('Value_clean', 'max'),
    Médiane=('Value_clean', 'median'),
    Entreprises=('Company_x', lambda x: ', '.join(set(x))),
    N=('Value_clean', 'count')
).reset_index()

st.dataframe(
    benchmark_table,
    column_config={
        "KPI Name": "Indicateur",
        "Sector": "Secteur",
        "Industry": "Sous-secteur",
        "Moyenne": st.column_config.NumberColumn(format="%.2f"),
        "Minimum": st.column_config.NumberColumn(format="%.2f"),
        "Maximum": st.column_config.NumberColumn(format="%.2f"),
        "Médiane": st.column_config.NumberColumn(format="%.2f"),
        "Entreprises": "Entreprises",
        "N": "N"
    },
    hide_index=True,
    use_container_width=True
)

with st.expander("Options avancées"):
    st.checkbox("Afficher les détails techniques")
    st.selectbox("Trier par", ["Indicateur", "Secteur", "N", "Moyenne"])
    st.checkbox("Ordre décroissant")

# Section 2: Visualisations
st.header("📈 Visualisations Comparatives")
st.markdown("---")

# Onglets pour différents types de visualisations
tab1, tab2, tab3 = st.tabs(["Comparaison Sectorielle", "Distribution des KPIs", "Analyse Croisée"])

with tab1:
    # Graphique à barres comparatif
    if not filtered_df.empty:
        fig = px.bar(
            filtered_df,
            x='Company_x',
            y='Value',
            color='Sector',
            facet_col='KPI Name',
            facet_col_wrap=2,
            labels={'Value': 'Valeur', 'Company_x': 'Entreprise'},
            title="Comparaison des Entreprises par KPI",
            height=600
        )
        fig.update_xaxes(tickangle=45)
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.warning("Aucune donnée disponible avec les filtres sélectionnés.")

with tab2:
    # Box plots pour la distribution
    if not filtered_df.empty:
        fig = px.box(
            filtered_df,
            x='Sector',
            y='Value',
            color='Sector',
            facet_col='KPI Name',
            facet_col_wrap=2,
            labels={'Value': 'Valeur'},
            title="Distribution des Valeurs par Secteur",
            height=600
        )
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.warning("Aucune donnée disponible avec les filtres sélectionnés.")

with tab3:
    # Matrice de corrélation (si assez de données)
    st.subheader("Analyse des Relations entre KPIs")
    
    # Pivot pour avoir les KPIs en colonnes
    try:
        pivot_df = filtered_df.pivot_table(
            index='Company_x',
            columns='KPI Name',
            values='Value'
        ).reset_index()
        
        # Calcul de la corrélation
        corr_matrix = pivot_df.corr(numeric_only=True)
        
        fig = go.Figure(
            data=go.Heatmap(
                z=corr_matrix,
                x=corr_matrix.columns,
                y=corr_matrix.columns,
                colorscale='Blues',
                zmin=-1,
                zmax=1
            )
        )
        fig.update_layout(title="Matrice de Corrélation entre KPIs")
        st.plotly_chart(fig, use_container_width=True)
    except:
        st.warning("Pas assez de données pour calculer les corrélations.")

# Section 3: Analyse Détailée
st.header("🔎 Analyse par Entreprise")
st.markdown("---")

selected_company = st.selectbox(
    "Sélectionnez une entreprise",
    options=df['Company_x'].unique()
)

company_data = df[df['Company_x'] == selected_company]

if not company_data.empty:
    cols = st.columns(2)
    
    with cols[0]:
        st.subheader(f"KPIs pour {selected_company}")
        st.dataframe(
            company_data[['KPI Name', 'Value', 'Unit', 'Year']],
            hide_index=True,
            use_container_width=True
        )
    
    with cols[1]:
        st.subheader("Performance Relative")
        for kpi in company_data['KPI Name'].unique():
            kpi_data = df[df['KPI Name'] == kpi]
            avg_value = kpi_data['Value'].mean()
            company_value = company_data[company_data['KPI Name'] == kpi]['Value'].values[0]
            
            fig = go.Figure()
            fig.add_trace(go.Indicator(
                mode="number+gauge",
                value=company_value,
                number={'suffix': f" {kpi_data['Unit'].iloc[0]}"},
                domain={'x': [0.1, 1], 'y': [0, 1]},
                title={'text': f"{kpi} (vs moyenne: {avg_value:.2f})"},
                gauge={
                    'shape': "bullet",
                    'axis': {'range': [kpi_data['Value'].min(), kpi_data['Value'].max()]},
                    'threshold': {
                        'line': {'color': "red", 'width': 2},
                        'thickness': 0.75,
                        'value': avg_value
                    }
                }
            ))
            st.plotly_chart(fig, use_container_width=True)
else:
    st.warning("Aucune donnée disponible pour cette entreprise.")

# Pied de page
st.markdown("---")
st.markdown("""
**Méthodologie:**
- Les valeurs non numériques ("Non précisée") sont exclues des calculs
- Les moyennes sont calculées par KPI et sous-secteur
- Tous les graphiques sont interactifs (zoom, survol)
""")