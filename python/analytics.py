# 1. Importing Libraries
import base64
import io
import json
import random
from datetime import date, timedelta

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd


# 2. Generating Synthetic Data
RANDOM_SEED = 42
random.seed(RANDOM_SEED)
TODAY = date(2026, 11, 5)

departments = [
    "Cardiology", "Neurology", "Orthopedics", "Pediatrics",
    "General Medicine", "Dermatology", "Oncology",
]
first_names = [
    "Aarav", "Aanya", "Aditya", "Anaya", "Arjun", "Diya", "Ishaan",
    "Kavya", "Meera", "Neel", "Riya", "Vihaan", "Zoya", "Kabir",
    "Ira", "Dev", "Myra", "Reyansh", "Tara", "Samar",
]
last_names = [
    "Sharma", "Mehta", "Iyer", "Kapoor", "Rao", "Nair", "Malhotra",
    "Das", "Bose", "Patel", "Khanna", "Sen", "Joshi", "Chopra",
]
doctors = [
    "Dr. Ananya Rao", "Dr. Kabir Mehta", "Dr. Mira Nair",
    "Dr. Arjun Sen", "Dr. Tara Kapoor", "Dr. Neel Iyer",
    "Dr. Riya Sharma", "Dr. Dev Patel",
]
diagnoses = {
    "Cardiology": ["Hypertension", "Arrhythmia", "Coronary artery disease", "Angina"],
    "Neurology": ["Migraine", "Epilepsy", "Neuropathy", "Concussion"],
    "Orthopedics": ["Fracture", "Arthritis", "Back pain", "Ligament injury"],
    "Pediatrics": ["Seasonal infection", "Asthma", "Dehydration", "Allergy"],
    "General Medicine": ["Viral fever", "Diabetes", "Respiratory infection", "Gastritis"],
    "Dermatology": ["Eczema", "Dermatitis", "Acne", "Fungal infection"],
    "Oncology": ["Lymphoma", "Breast cancer", "Leukemia", "Lung cancer"],
}
department_costs = {
    "Cardiology": 18500, "Neurology": 15200, "Orthopedics": 12800,
    "Pediatrics": 7200, "General Medicine": 6200, "Dermatology": 5600,
    "Oncology": 24800,
}
room_charges = {"General": 1600, "Semi-private": 3400, "Private": 6200}

records = []
for number in range(1, 101):
    department = random.choice(departments)
    room_type = random.choices(
        list(room_charges), weights=[48, 34, 18], k=1
    )[0]
    length_of_stay = random.randint(1, 18)
    admission_date = TODAY - timedelta(days=random.randint(0, 364))
    bill_amount = (
        department_costs[department]
        + room_charges[room_type] * length_of_stay
        + random.randint(1800, 14500)
    )
    records.append({
        "Patient_ID": "MM-{:04d}".format(number),
        "Patient_Name": "{} {}".format(
            random.choice(first_names), random.choice(last_names)
        ),
        "Age": random.randint(2, 88),
        "Gender": random.choice(["Female", "Male"]),
        "Department": department,
        "Admission_Date": admission_date,
        "Discharge_Date": admission_date + timedelta(days=length_of_stay),
        "Diagnosis": random.choice(diagnoses[department]),
        "Doctor_Name": random.choice(doctors),
        "Room_Type": room_type,
        "Length_of_Stay": length_of_stay,
        "Bill_Amount": bill_amount,
        "Payment_Status": random.choices(
            ["Paid", "Pending"], weights=[72, 28], k=1
        )[0],
    })


# 3. Creating the DataFrame
df = pd.DataFrame(records)
df["Admission_Date"] = pd.to_datetime(df["Admission_Date"])
df["Discharge_Date"] = pd.to_datetime(df["Discharge_Date"])


# 4. Data Cleaning
df = df.drop_duplicates(subset="Patient_ID").reset_index(drop=True)
df["Age"] = df["Age"].fillna(df["Age"].median()).astype(int)
df["Bill_Amount"] = df["Bill_Amount"].fillna(0).round(2)
df["Length_of_Stay"] = df["Length_of_Stay"].fillna(0).astype(int)


# 5. Statistical Analysis
total_patients = int(df["Patient_ID"].count())
average_age = round(float(df["Age"].mean()), 1)
total_revenue = round(float(df["Bill_Amount"].sum()), 2)
average_stay = round(float(df["Length_of_Stay"].mean()), 1)
pending_amount = round(
    float(df.loc[df["Payment_Status"] == "Pending", "Bill_Amount"].sum()), 2
)
paid_amount = round(
    float(df.loc[df["Payment_Status"] == "Paid", "Bill_Amount"].sum()), 2
)
department_counts = df.groupby("Department").size().sort_values(ascending=False)
most_occupied_department = str(department_counts.index[0])
payment_counts = df["Payment_Status"].value_counts()
gender_counts = df["Gender"].value_counts()


# 6. Department Analysis
department_summary = df.groupby("Department").agg(
    Patient_Count=("Patient_ID", "count"),
    Average_Age=("Age", "mean"),
    Average_Stay=("Length_of_Stay", "mean"),
    Total_Billing=("Bill_Amount", "sum"),
).reset_index()
department_summary["Average_Age"] = department_summary["Average_Age"].round(1)
department_summary["Average_Stay"] = department_summary["Average_Stay"].round(1)
department_summary["Total_Billing"] = department_summary["Total_Billing"].round(2)
department_summary = department_summary.sort_values(
    "Patient_Count", ascending=False
)


# 7. Financial Analysis
financial_summary = {
    "total_revenue": total_revenue,
    "average_bill": round(float(df["Bill_Amount"].mean()), 2),
    "paid_amount": paid_amount,
    "pending_amount": pending_amount,
    "paid_count": int(payment_counts.get("Paid", 0)),
    "pending_count": int(payment_counts.get("Pending", 0)),
}
department_revenue = df.groupby("Department")["Bill_Amount"].sum().sort_values(
    ascending=False
)
monthly_periods = pd.period_range(
    end=pd.Period(TODAY, freq="M"), periods=13, freq="M"
)
monthly_admissions = (
    df.assign(Month=df["Admission_Date"].dt.to_period("M"))
    .groupby("Month").size().reindex(monthly_periods, fill_value=0)
)


# 8. Matplotlib Visualizations
# Desktop notebooks can display charts; this browser version saves PNGs.
plt.rcParams.update({
    "figure.facecolor": "#101b2b",
    "axes.facecolor": "#101b2b",
    "axes.edgecolor": "#34445a",
    "axes.labelcolor": "#a9b8cb",
    "xtick.color": "#a9b8cb",
    "ytick.color": "#a9b8cb",
    "text.color": "#e9f0f8",
    "font.family": "DejaVu Sans",
    "font.size": 9,
})


def export_chart(figure):
    """Return a Matplotlib figure as a browser-ready PNG data URL."""
    image_buffer = io.BytesIO()
    figure.savefig(
        image_buffer, format="png", dpi=130, bbox_inches="tight",
        facecolor=figure.get_facecolor(),
    )
    plt.close(figure)
    encoded_image = base64.b64encode(image_buffer.getvalue()).decode("ascii")
    return "data:image/png;base64," + encoded_image


chart_images = {}
chart_colors = ["#45c7b5", "#65a8ff", "#f2b66d", "#e8838d", "#9278d1", "#7ecb8f", "#62b6c9"]

figure, axis = plt.subplots(figsize=(8, 3.4))
ordered_counts = department_counts.reindex(departments, fill_value=0)
plt.bar(ordered_counts.index, ordered_counts.values, color=chart_colors, width=0.62)
axis.set_title("Patient admissions by department", loc="left", pad=15, fontsize=12, fontweight="bold")
axis.set_ylabel("Patients")
axis.grid(axis="y", color="#34445a", alpha=0.45, linewidth=0.7)
axis.set_axisbelow(True)
axis.spines[["top", "right", "left"]].set_visible(False)
axis.tick_params(axis="y", length=0)
axis.tick_params(axis="x", rotation=18, labelsize=8, length=0)
chart_images["department"] = export_chart(figure)

figure, axis = plt.subplots(figsize=(5, 3.5))
gender_labels = list(gender_counts.index)
plt.pie(
    gender_counts.values, labels=gender_labels, autopct="%1.0f%%",
    startangle=90, colors=["#45c7b5", "#65a8ff"],
    textprops={"color": "#dce7f3", "fontsize": 9},
    wedgeprops={"width": 0.42, "edgecolor": "#101b2b", "linewidth": 3},
    pctdistance=0.78,
)
axis.set_title("Gender distribution", loc="left", pad=14, fontsize=12, fontweight="bold")
chart_images["gender"] = export_chart(figure)

figure, axis = plt.subplots(figsize=(8, 3.4))
plt.plot(
    [period.strftime("%b %y") for period in monthly_periods],
    monthly_admissions.values, color="#45c7b5", linewidth=2.5,
    marker="o", markersize=4, markerfacecolor="#101b2b",
    markeredgewidth=2,
)
axis.fill_between(
    range(len(monthly_periods)), monthly_admissions.values,
    color="#45c7b5", alpha=0.1,
)
axis.set_title("Monthly patient admissions", loc="left", pad=15, fontsize=12, fontweight="bold")
axis.set_ylabel("Patients")
axis.grid(axis="y", color="#34445a", alpha=0.45, linewidth=0.7)
axis.set_axisbelow(True)
axis.spines[["top", "right", "left"]].set_visible(False)
axis.tick_params(axis="y", length=0)
axis.tick_params(axis="x", rotation=35, labelsize=8, length=0)
chart_images["monthly"] = export_chart(figure)

figure, axis = plt.subplots(figsize=(8, 3.4))
ordered_revenue = department_revenue.reindex(departments, fill_value=0).sort_values()
axis.barh(ordered_revenue.index, ordered_revenue.values, color=chart_colors)
axis.set_title("Revenue by department", loc="left", pad=15, fontsize=12, fontweight="bold")
axis.set_xlabel("Revenue (INR)")
axis.grid(axis="x", color="#34445a", alpha=0.45, linewidth=0.7)
axis.set_axisbelow(True)
axis.spines[["top", "right", "bottom"]].set_visible(False)
axis.tick_params(axis="both", length=0)
axis.xaxis.set_major_formatter(plt.FuncFormatter(lambda value, _: "₹{:,.0f}".format(value)))
chart_images["revenue"] = export_chart(figure)


# Prepare the DataFrame and results for the browser interface.
patient_records = df.copy()
patient_records["Admission_Date"] = patient_records["Admission_Date"].dt.strftime("%Y-%m-%d")
patient_records["Discharge_Date"] = patient_records["Discharge_Date"].dt.strftime("%Y-%m-%d")

dashboard_data = {
    "patients": patient_records.to_dict(orient="records"),
    "departments": department_summary.to_dict(orient="records"),
    "department_counts": [
        {"department": department, "count": int(count)}
        for department, count in ordered_counts.items()
    ],
    "department_revenue": [
        {"department": department, "amount": round(float(amount), 2)}
        for department, amount in department_revenue.items()
    ],
    "kpis": {
        "total_patients": total_patients,
        "average_age": average_age,
        "total_revenue": total_revenue,
        "average_stay": average_stay,
        "pending_amount": pending_amount,
        "most_occupied_department": most_occupied_department,
    },
    "financial": financial_summary,
    "gender_counts": {str(key): int(value) for key, value in gender_counts.items()},
    "payment_counts": {str(key): int(value) for key, value in payment_counts.items()},
    "payment_distribution": [
        {
            "status": status,
            "count": int(payment_counts.get(status, 0)),
            "share": round(float(payment_counts.get(status, 0)) / total_patients * 100, 1),
        }
        for status in ["Paid", "Pending"]
    ],
    "monthly_admissions": [
        {"month": period.strftime("%b %y"), "count": int(count)}
        for period, count in monthly_admissions.items()
    ],
    "generated_on": TODAY.isoformat(),
}
dashboard_json = json.dumps(dashboard_data)
chart_images_json = json.dumps(chart_images)

# These familiar inspection methods make the analysis easy to explore in class.
info_buffer = io.StringIO()
df.info(buf=info_buffer)
lab_output = "DATAFRAME PREVIEW\n{}\n\nDATAFRAME INFO\n{}\n\nDESCRIPTIVE STATISTICS\n{}\n\nDEPARTMENT GROUPBY\n{}\n\nPAYMENT STATUS VALUE COUNTS\n{}\n\nSUMMARY\nPatients: {} | Revenue: INR {:,.2f} | Average stay: {} days".format(
    df.head().to_string(index=False),
    info_buffer.getvalue(),
    df.describe().round(1).to_string(),
    department_summary.to_string(index=False),
    df["Payment_Status"].value_counts().to_string(),
    total_patients,
    total_revenue,
    average_stay,
)