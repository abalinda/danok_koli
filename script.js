// app.js

// Function to fetch the current exchange rate
async function fetchExchangeRate() {
    const currentDate = new Date();
    const day = String(currentDate.getDate()).padStart(2, '0');
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const year = currentDate.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    const url = "https://www.nbrm.mk/KLServiceNOV/GetExchangeRateD";
    const params = new URLSearchParams({
        StartDate: formattedDate,
        EndDate: formattedDate,
        format: "json"
    });

    try {
        const response = await fetch(`${url}?${params.toString()}`);
        if (response.ok) {
            const data = await response.json();
            const dneven_kurs = parseFloat(data[0]["sreden"]);
            console.log(`Дневен курс на еврото денеска (${formattedDate}) е: ${dneven_kurs}`);
            return dneven_kurs;
        } else {
            console.error(`Failed to retrieve data. Status code: ${response.status}`);
            return 61.5; // Default value
        }
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        return 61.5; // Default value
    }
}

// Define tax rate tiers
function getTaxRate(carValue) {
    const tiers = [
        [0, 10000, 0],
        [10001, 12000, 0.01],
        [12001, 14000, 0.02],
        [14001, 16000, 0.04],
        [16001, 18000, 0.06],
        [18001, 20000, 0.08],
        [20001, 23000, 0.1],
        [23001, 26000, 0.12],
        [26001, 29000, 0.14],
        [29001, 32000, 0.16],
        [32001, 35000, 0.17],
        [35001, 40000, 0.18],
        [40001, 50000, 0.19],
        [50001, Infinity, 0.2],
    ];
    for (let [low, high, rate] of tiers) {
        if (low <= carValue && carValue <= high) {
            return rate;
        }
    }
    return 0;
}

// Define CO2 coefficient tiers for Benzin
function getCO2CoefficientBenzin(co2Emissions) {
    const tiers = [
        [[0, 0], 0],
        [[1, 63], 8],
        [[64, 94], 15],
        [[95, 113], 30],
        [[114, 123], 45],
        [[124, 135], 60],
        [[136, 153], 75],
        [[154, 160], 105],
        [[161, 172], 180],
        [[173, 188], 265],
        [[189, 210], 390],
        [[211, 249], 495],
        [[250, 282], 590],
        [[283, Infinity], 695],
    ];
    for (let [[low, high], coefficient] of tiers) {
        if (low <= co2Emissions && co2Emissions <= high) {
            return coefficient;
        }
    }
    return 0;
}

// Define CO2 coefficient tiers for Diesel
function getCO2CoefficientDiesel(co2Emissions) {
    const tiers = [
        [[0, 0], 0],
        [[1, 63], 15],
        [[64, 94], 30],
        [[95, 113], 60],
        [[114, 123], 90],
        [[124, 135], 120],
        [[136, 153], 150],
        [[154, 160], 195],
        [[161, 172], 270],
        [[173, 188], 375],
        [[189, 210], 510],
        [[211, 249], 605],
        [[250, 282], 750],
        [[283, Infinity], 880],
    ];
    for (let [[low, high], coefficient] of tiers) {
        if (low <= co2Emissions && co2Emissions <= high) {
            return coefficient;
        }
    }
    return 0;
}

// Calculate DMV
function calculateDMV(carValue, co2Emissions, fuelType, exchangeRate) {
    const taxRate = getTaxRate(carValue);
    console.log(`Tax Rate: ${taxRate}`);

    let co2Coefficient;
    if (fuelType.toLowerCase() === "бензин") {
        co2Coefficient = getCO2CoefficientBenzin(co2Emissions);
    } else {
        co2Coefficient = getCO2CoefficientDiesel(co2Emissions);
    }

    const dmv = (carValue * taxRate) * exchangeRate + (co2Emissions * co2Coefficient);

    return dmv;
}

// Calculate DDV
function calculateDDV(pred_ddv) {
    const so_ddv = pred_ddv * 1.18;
    return so_ddv;
}

// Format number with commas
function formatNumber(number) {
    return number.toLocaleString('mk-MK');
}

// Handle form submission
async function handleFormSubmission(event) {
    event.preventDefault();

    const carValueInput = document.getElementById('car_value').value;
    const transportationCostInput = document.getElementById('transportation_cost').value;
    const co2EmissionsInput = document.getElementById('co2_emissions').value;
    const fuelTypeInput = document.querySelector('input[name="fuel_type"]:checked').value;

    // Remove commas and parse to integers
    const carValue = parseInt(carValueInput.replace(/,/g, ''));
    const transportationCost = parseInt(transportationCostInput.replace(/,/g, ''));
    const co2Emissions = parseInt(co2EmissionsInput.replace(/,/g, ''));

    // Validate inputs
    if (isNaN(carValue) || isNaN(transportationCost) || isNaN(co2Emissions) ||
        carValue <= 0 || transportationCost <= 0 || co2Emissions <= 0) {
        alert("Внесете позитивни природни броеви (1, 2, 3, …) или 0.");
        return;
    }

    // Fetch exchange rate
    const dneven_kurs = await fetchExchangeRate();

    // Perform calculations
    const cenaNaDMV = calculateDMV(carValue, co2Emissions, fuelTypeInput, dneven_kurs);
    const konecna = calculateDDV((cenaNaDMV / dneven_kurs) + carValue + transportationCost);

    // Prepare data to pass to result.html
    const resultData = {
        car_value: formatNumber(carValue),
        transportation_cost: formatNumber(transportationCost),
        co2_emissions: co2Emissions,
        fuel_type: fuelTypeInput,
        cena_na_dmv: Math.round(cenaNaDMV),
        cena_na_dmv_evra: Math.round(cenaNaDMV / dneven_kurs),
        konecna: Math.round(konecna - carValue),
        dneven_kurs: dneven_kurs.toFixed(2)
    };

    // Store data in localStorage
    localStorage.setItem('resultData', JSON.stringify(resultData));

    // Redirect to result.html
    window.location.href = 'result.html';
}

// Initialize the calculator form
function initCalculator() {
    const form = document.getElementById('tax-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmission);
    }
}

// Update the displayResult function
function displayResult() {
    const resultData = JSON.parse(localStorage.getItem('resultData'));
    if (!resultData) {
        alert("Нема податоци за приказ.");
        window.location.href = 'calculator.html';
        return;
    }

    // Update exchange rate with animation
    const rateElement = document.getElementById('dneven_kurs');
    rateElement.textContent = resultData.dneven_kurs;
    rateElement.parentElement.classList.add('updated');
    
    // Remove animation class after it completes
    setTimeout(() => {
        rateElement.parentElement.classList.remove('updated');
    }, 500);

    // Rest of your display updates...
    document.getElementById('konecna').textContent = formatNumber(resultData.konecna) + " €";
    document.getElementById('car_value').textContent = resultData.car_value + " €";
    document.getElementById('transportation_cost').textContent = resultData.transportation_cost + " €";
    document.getElementById('co2_emissions').textContent = resultData.co2_emissions + " g/km";
    document.getElementById('fuel_type').textContent = resultData.fuel_type;
}

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tax-form')) {
        initCalculator();
    } else if (document.getElementById('result-container')) {
        displayResult();
    }
}); 