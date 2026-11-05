# MediMetrics

MediMetrics is a static, browser-based hospital analytics dashboard for a Class XII CBSE Informatics Practices project. It generates 100 fictional patient records and analyzes them with Python, Pandas, and Matplotlib running locally through Pyodide. No Python server, Node backend, or external database is used.

## Project files

```text
.
├── index.html
├── requirements.txt
├── script.js
├── style.css
└── python/
    └── analytics.py
```

`python/analytics.py` is the single source of analytics code. The browser fetches this file, displays it in the Python Code Lab, and runs it with `pyodide.runPythonAsync()`. Pandas calculations and Matplotlib PNG charts are returned to the dashboard from the same Python execution.

## Run locally

The app must be served over HTTP so the browser can fetch `python/analytics.py`. From the project directory, run:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`. An internet connection is required to load Pyodide, Pandas, Matplotlib, fonts, and icons from their CDNs. The first Python startup may take a little while as the packages download.

For Pylance diagnostics or running `python/analytics.py` with a local Python interpreter, install the optional local dependencies:

```bash
python3 -m pip install -r requirements.txt
```

These packages are not needed to serve or deploy the browser dashboard; it loads Pandas and Matplotlib through Pyodide.

## Deploy to Vercel

1. Import the repository into Vercel, or connect it to a Vercel project.
2. Select **Other** as the framework preset.
3. Leave the build command empty and set the output directory to `.`.
4. Deploy. Vercel serves `index.html`, `script.js`, `style.css`, and `python/analytics.py` as static files.

No environment variables or server-side functions are required. Keep the `python/` directory at the project root because the browser fetches the source at the relative URL `python/analytics.py`.

## Using the dashboard

- Use the sidebar to switch between overview, records, department, finance, visualizations, the Python Code Lab, and project information.
- Search records by patient ID or name, filter by department or gender, sort a column, and move between pages.
- Choose **Regenerate data** to rerun the Python source with the next random seed. The initial seed is 42, so the first dataset is reproducible.
- In Python Code Lab, select a section to highlight those source lines. **Run Python code** executes the selection when text is selected, or the full editor contents otherwise. **Reset code** restores the fetched source.
- Student and school details in About Project are editable and are saved in the current browser.

## Academic notes

The dataset is synthetic and fixed to a 2026 reference date so the sample charts remain reproducible and consistent. All records, names, and medical details are fictional. Pyodide, Pandas, and Matplotlib execute in the visitor's browser; no patient data is sent to a backend.