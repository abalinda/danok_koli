from flask import Flask, request, render_template
import requests as r
import json as J
import datetime as dt
from translate import Translator

app = Flask(__name__)


# Define your existing functions here
def get_tax_rate(car_value):
    tiers = [
        (0, 10000, 0),
        (10001, 12000, 0.01),
        (12001, 14000, 0.02),
        (14001, 16000, 0.04),
        (16001, 18000, 0.06),
        (18001, 20000, 0.08),
        (20001, 23000, 0.1),
        (23001, 26000, 0.12),
        (26001, 29000, 0.14),
        (29001, 32000, 0.16),
        (32001, 35000, 0.17),
        (35001, 40000, 0.18),
        (40001, 50000, 0.19),
        (50001, float("inf"), 0.2),  # Poskapi od 50k
    ]
    for low, high, rate in tiers:
        if low <= car_value <= high:
            return rate
    return 0


def get_co2_coefficient_benzin(co2_emissions):
    tiers = [
        ((0, 0), 0),
        ((1, 63), 8),
        ((64, 94), 15),
        ((95, 113), 30),
        ((114, 123), 45),
        ((124, 135), 60),
        ((136, 153), 75),
        ((154, 160), 105),
        ((161, 172), 180),
        ((173, 188), 265),
        ((189, 210), 390),
        ((211, 249), 495),
        ((250, 282), 590),
        ((283, float("inf")), 695),  # Ako ne moze da se odredi CO2 ili e nad 282 g/km
    ]
    for (low, high), coefficient in tiers:
        if low <= co2_emissions <= high:
            return coefficient
    return 0


def get_co2_coefficient_diesel(co2_emissions):
    tiers = [
        ((0, 0), 0),
        ((1, 63), 15),
        ((64, 94), 30),
        ((95, 113), 60),
        ((114, 123), 90),
        ((124, 135), 120),
        ((136, 153), 150),
        ((154, 160), 195),
        ((161, 172), 270),
        ((173, 188), 375),
        ((189, 210), 510),
        ((211, 249), 605),
        ((250, 282), 750),
        ((283, float("inf")), 880),  # Ako ne moze da se odredi CO2 ili e nad 282 g/km
    ]
    for (low, high), coefficient in tiers:
        if low <= co2_emissions <= high:
            return coefficient
    return 0


def calculate_ddv(pred_ddv):
    so_ddv = pred_ddv * 1.18
    return so_ddv


# Fetch exchange rate
current_date = dt.datetime.now()
formatted_date = current_date.strftime("%d-%b-%Y")
translator = Translator(to_lang="mk")
url = "https://www.nbrm.mk/KLServiceNOV/GetExchangeRateD"

params = {"StartDate": formatted_date, "EndDate": formatted_date, "format": "json"}
response = r.get(url, params=params)
if response.status_code == 200:
    data = response.json()
    dneven_kurs = float(data[0]["sreden"])
    print(
        f"Дневен курс на еврото денеска ({translator.translate(formatted_date).replace('-', ' ')}) е:",
        dneven_kurs,
    )
else:
    dneven_kurs = 61.5  # Default value or handle as needed
    print(f"Failed to retrieve data. Status code: {response.status_code}")


def calculate_dmv(car_value, co2_emissions, fuel_type):
    # Get tax rate based on car value
    tax_rate = get_tax_rate(car_value)
    print(tax_rate)

    # Get CO2 coefficient based on emissions
    if fuel_type.lower() == "бензин":
        co2_coefficient = get_co2_coefficient_benzin(co2_emissions)
    else:
        co2_coefficient = get_co2_coefficient_diesel(co2_emissions)
    # Calculate the Motor Vehicle Tax (DMV)
    dmv = (car_value * tax_rate) * dneven_kurs + (co2_emissions * co2_coefficient)
    co2_tax = co2_emissions * co2_coefficient

    # Calculate total cost
    cena_na_dmv = dmv + co2_tax
    print(f"Total Cost: {cena_na_dmv}")

    return dmv


@app.route("/")
def welcome():
    return render_template("welcome.html")


@app.route("/calculator")
def index():
    return render_template("index.html", dneven_kurs=dneven_kurs)


@app.route("/calculate", methods=["POST"])
def calculate():
    try:
        car_value = int(request.form["car_value"])
        transportation_cost = int(request.form["transportation_cost"])
        co2_emissions = int(request.form["co2_emissions"])
        fuel_type = request.form["fuel_type"]

        # Ensure all inputs are positive
        if car_value <= 0 or transportation_cost <= 0 or co2_emissions <= 0:
            raise ValueError("All inputs must be positive integers.")

    except (ValueError, KeyError):
        return "Внесете позитивни природни броеви (1, 2, 3, …) или 0", 400

    # Perform calculations
    cena_na_dmv = calculate_dmv(car_value, co2_emissions, fuel_type)
    konecna = calculate_ddv(
        pred_ddv=(cena_na_dmv / dneven_kurs) + car_value + transportation_cost
    )
    return render_template(
        "result.html",
        car_value="{:,}".format(car_value),
        fuel_type=fuel_type,
        transportation_cost=transportation_cost,
        co2_emissions=co2_emissions,
        cena_na_dmv=round(cena_na_dmv),
        cena_na_dmv_evra=round(cena_na_dmv / dneven_kurs),
        konecna=round(konecna - car_value),
        dneven_kurs=dneven_kurs,
    )


if __name__ == "__main__":
    app.run(debug=True)
