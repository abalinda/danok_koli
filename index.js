// index.js
const EXCHANGE_RATE = 61.5; // Default exchange rate if API fails

// Tax rate calculation based on car value
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
        [50001, Infinity, 0.2]
    ];

    for (const [low, high, rate] of tiers) {
        if (carValue >= low && carValue <= high) {
            return rate;
        }
    }
    return 0;
}

// CO2 coefficient calculation for petrol vehicles
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
        [[283, Infinity], 695]
    ];

    for (const [[low, high], coefficient] of tiers) {
        if (co2Emissions >= low && co2Emissions <= high) {
            return coefficient;
        }
    }
    return 0;
}

// CO2 coefficient calculation for diesel vehicles
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
        [[283, Infinity], 880]
    ];

    for (const [[low, high], coefficient] of tiers) {
        if (co2Emissions >= low && co2Emissions <= high) {
            return coefficient;
        }
    }
    return 0;
}

// Calculate DMV (Motor Vehicle Tax)
function calculateDMV(carValue, co2Emissions, fuelType) {
    const taxRate = getTaxRate(carValue);
    const co2Coefficient = fuelType.toLowerCase() === 'бензин' 
        ? getCO2CoefficientBenzin(co2Emissions)
        : getCO2CoefficientDiesel(co2Emissions);

    const dmv = (carValue * taxRate) * EXCHANGE_RATE + (co2Emissions * co2Coefficient);
    const co2Tax = co2Emissions * co2Coefficient;
    const totalCost = dmv + co2Tax;

    return totalCost;
}

// Calculate DDV (VAT)
function calculateDDV(preDDV) {
    return preDDV * 1.18;
}

// Main calculation function
async function calculateTax(formData) {
    const carValue = parseInt(formData.get('car_value'));
    const transportationCost = parseInt(formData.get('transportation_cost'));
    const co2Emissions = parseInt(formData.get('co2_emissions'));
    const fuelType = formData.get('fuel_type');

    // Input validation
    if (carValue <= 0 || transportationCost <= 0 || co2Emissions <= 0) {
        throw new Error("Внесете позитивни природни броеви (1, 2, 3, …) или 0");
    }

    // Fetch current exchange rate
    let exchangeRate = EXCHANGE_RATE;
    try {
        const date = new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace(/ /g, '-');
        
        const response = await fetch(`https://www.nbrm.mk/KLServiceNOV/GetExchangeRateD?StartDate=${date}&EndDate=${date}&format=json`);
        if (response.ok) {
            const data = await response.json();
            exchangeRate = parseFloat(data[0].sreden);
        }
    } catch (error) {
        console.error('Failed to fetch exchange rate:', error);
    }

    const dmvCost = calculateDMV(carValue, co2Emissions, fuelType);
    const finalCost = calculateDDV((dmvCost / exchangeRate) + carValue + transportationCost);

    return {
        carValue: carValue.toLocaleString(),
        transportationCost,
        co2Emissions,
        fuelType,
        dmvCost: Math.round(dmvCost),
        dmvCostEuro: Math.round(dmvCost / exchangeRate),
        finalCost: Math.round(finalCost - carValue),
        exchangeRate
    };
}

// Event listener for form submission
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData(form);
            const result = await calculateTax(formData);
            displayResult(result);
        } catch (error) {
            showError(error.message);
        }
    });
});

// Display functions
function displayResult(result) {
    const resultHTML = `
        <div class="exchange-rate">
            Денешен среден курс ЕУР/МКД според НБРМ: ${result.exchangeRate}
        </div>
        
        <div class="container">
            <h1>Резултат од пресметката</h1>
            
            <div class="final-price">
                <div class="final-price-label">Вкупна сума за плаќање:</div>
                <div class="final-price-amount">${result.finalCost} €</div>
                <div class="final-price-label">со вклучен ДДВ</div>
            </div>

            <div class="section">
                <h2>Внесени параметри</h2>
                <div class="parameters">
                    <div class="parameter-item">
                        <strong>Вредност на возилото:</strong>
                        <div>${result.carValue} €</div>
                    </div>
                    <div class="parameter-item">
                        <strong>Трошоци за транспорт:</strong>
                        <div>${result.transportationCost} €</div>
                    </div>
                    <div class="parameter-item">
                        <strong>CO2 емисија:</strong>
                        <div>${result.co2Emissions} g/km</div>
                    </div>
                    <div class="parameter-item">
                        <strong>Тип гориво:</strong>
                        <div>${result.fuelType}</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2>Формула за пресметка</h2>
                <div class="formula">
                    <strong>ДМВ = (ВМВ x пВВ) x СКД + СО2 x кСО2</strong>
                </div>
                <ul>
                    <li><em>ДМВ</em> е данок на моторно возило изразен во денари;</li>
                    <li><em>ВМВ</em> е вредност на моторното возило искажано во евра;</li>
                    <li><em>СКД</em> е среден курс на Народната Банка на Република Северна Македонија;</li>
                    <li><em>пВВ</em> е процент според цената на моторното возило;</li>
                    <li><em>CO2</em> е емисија на CO2 за соодветното моторно возило;</li>
                    <li><em>кCO2</em> е коефициент кој одговара за граничните вредности на CO2.</li>
                </ul>
            </div>
            
            <button onclick="window.location.reload()">Нова пресметка</button>
        </div>
    `;
    
    document.body.innerHTML = resultHTML;
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'flash-message error';
    errorDiv.textContent = message;
    document.querySelector('.container').prepend(errorDiv);
    
    setTimeout(() => errorDiv.remove(), 5000);
}