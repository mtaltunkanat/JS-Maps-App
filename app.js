// Harita oluşturma (Leaflet ile)
var map = L.map('googleMap').setView([38.9637, 35.2433], 6); // Başlangıç merkezi ve zoom seviyesi

// OpenStreetMap'den harita katmanlarını yükleme
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
}).addTo(map);

// Harita işaretçileri için global değişkenler
let originMarker, destinationMarker, routeLine;

// Şehir ismi araması için API sorgusu yapma
function searchCity(inputId) {
    const input = document.getElementById(inputId).value;

    if (input.length > 2) { // En az 3 harf yazıldığında arama başlat
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${input}&addressdetails=1&limit=5`)
        .then(response => response.json())
        .then(data => {
            let suggestions = '';
            data.forEach(item => {
                const city = item.display_name;
                const lat = item.lat; // Enlem
                const lon = item.lon; // Boylam

                suggestions += `<div onclick="selectCity('${city}', ${lat}, ${lon}, '${inputId}')">${city}</div>`;
            });

            document.getElementById(`suggestions-${inputId}`).innerHTML = suggestions;
        });
    } else {
        document.getElementById(`suggestions-${inputId}`).innerHTML = ''; // Temizleme
    }
}

// Şehir seçimi yapıldığında input alanına şehri yerleştir ve haritayı güncelle
function selectCity(city, lat, lon, inputId) {
    document.getElementById(inputId).value = city;
    document.getElementById(`suggestions-${inputId}`).innerHTML = ''; // Önerileri gizle

    // Harita üzerinde seçilen şehre zoom yapma ve merkezleme
    map.setView([lat, lon], 12); // Seçilen konuma yakınlaştır (zoom seviyesi: 12)
    
    // İşaretçi ekleme
    if (inputId === 'from') {
        if (originMarker) {
            map.removeLayer(originMarker); // Var olan işaretçiyi kaldır
        }
        originMarker = L.marker([lat, lon]).addTo(map).bindPopup(city).openPopup();
    } else {
        if (destinationMarker) {
            map.removeLayer(destinationMarker); // Var olan işaretçiyi kaldır
        }
        destinationMarker = L.marker([lat, lon]).addTo(map).bindPopup(city).openPopup();
    }

    // İki şehir arasında çizgi çekme ve rotayı hesaplama
    drawRoute();
}

// İki şehir arasında çizgi çekme ve mesafe ile süreyi hesaplama
function drawRoute() {
    if (originMarker && destinationMarker) {
        const originLatLng = originMarker.getLatLng();
        const destinationLatLng = destinationMarker.getLatLng();
        
        const latLngs = [originLatLng, destinationLatLng];

        if (routeLine) {
            map.removeLayer(routeLine); // Var olan çizgiyi kaldır
        }
        
        routeLine = L.polyline(latLngs, { color: 'blue' }).addTo(map); // Çizgi ekleme
        map.fitBounds(routeLine.getBounds()); // Haritayı çizgiye göre ayarla

        // Mesafe ve süreyi OSRM üzerinden hesaplayalım
        const url = `https://router.project-osrm.org/route/v1/driving/${originLatLng.lng},${originLatLng.lat};${destinationLatLng.lng},${destinationLatLng.lat}?overview=false&geometries=geojson&alternatives=false&steps=true`;

        fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.routes && data.routes.length > 0) {
                const distance = (data.routes[0].distance / 1000).toFixed(2); // Mesafeyi km cinsinden alalım
                const durationInMinutes = (data.routes[0].duration / 60); // Süreyi dakika cinsinden alalım
                
                // Süreyi saat ve dakikaya bölme
                const hours = Math.floor(durationInMinutes / 60); // Tam saat kısmı
                const minutes = Math.round(durationInMinutes % 60); // Kalan dakika kısmı

                const output = document.getElementById('output');
                output.innerHTML = `
                    <div class='alert-info'>
                        From: ${originMarker.getPopup().getContent()}<br />
                        To: ${destinationMarker.getPopup().getContent()}<br />
                        Driving distance <i class='fa-solid fa-road'></i>: ${distance} km.<br />
                        Duration <i class='fa-solid fa-hourglass-start'></i>: ${hours} hours and ${minutes} minutes.
                    </div>
                `;
            } else {
                // Hata durumunda mesaj gösterme
                document.getElementById('output').innerHTML = "<div class='alert-danger'>Could not retrieve driving distance.</div>";
            }
        })
        .catch(err => {
            document.getElementById('output').innerHTML = "<div class='alert-danger'>An error occurred while calculating the route.</div>";
        });
    }
}
