// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const carValue = urlParams.get('carValue');
const transportationCost = urlParams.get('transportationCost');
const co2Emissions = urlParams.get('co2_emissions');
const fuelType = urlParams.get('fuelType');

// Function to format numbers with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Update the display values
document.getElementById('car_value').textContent = '€' + formatNumber(carValue);
document.getElementById('transportation_cost').textContent = '€' + formatNumber(transportationCost);
document.getElementById('co2_emissions').textContent = co2Emissions + ' g/km';
document.getElementById('fuel_type').textContent = fuelType;

// Calculate final price (add your calculation logic here)
const finalPrice = calculateFinalPrice(carValue, transportationCost, co2Emissions, fuelType);
document.getElementById('konecna').textContent = '€' + formatNumber(finalPrice);

function calculateFinalPrice(carValue, transportationCost, co2Emissions, fuelType) {
    // Add your calculation logic here
    // This is a placeholder - replace with your actual calculation
    return parseFloat(carValue) + parseFloat(transportationCost);
}

// Fetch and display exchange rate
fetch('https://api.example.com/exchange-rate') // Replace with actual API endpoint
    .then(response => response.json())
    .then(data => {
        document.getElementById('dneven_kurs').textContent = data.rate;
    })
    .catch(error => {
        console.error('Error fetching exchange rate:', error);
        document.getElementById('dneven_kurs').textContent = '61.5'; // Fallback value
    }); 