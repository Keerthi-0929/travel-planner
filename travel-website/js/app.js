/***********************
 GLOBAL STATE
************************/
let cart = [];
let total = 0;

/***********************
 AUTOCOMPLETE
************************/
async function autoSuggest() {
  const input = document.getElementById("destination");
  const box = document.getElementById("suggestions");
  if (!input || input.value.length < 3) { if (box) box.innerHTML = ""; return; }

  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${input.value}&limit=5`);
  const data = await res.json();
  box.innerHTML = "";
  data.forEach(p => {
    const li = document.createElement("li");
    li.textContent = p.display_name;
    li.onclick = () => { input.value = p.display_name; box.innerHTML = ""; };
    box.appendChild(li);
  });
}

/***********************
 NAVIGATION
************************/
function goToPlaces() {
  const city = document.getElementById("destination").value.trim();
  if (!city) return alert("Enter city or country");
  localStorage.setItem("city", city);
  window.location.href = "places.html";
}

/***********************
 FALLBACK PLACES
************************/
const famousPlaces = {
  india: ["Taj Mahal", "Goa Beaches", "Jaipur City Palace"],
  france: ["Eiffel Tower", "Louvre Museum", "Versailles Palace"],
  usa: ["Statue of Liberty", "Grand Canyon", "Niagara Falls"],
  china: ["Great Wall", "Forbidden City", "Terracotta Army"]
};

/***********************
 LOAD PLACES PAGE
************************/
if (location.pathname.includes("places.html")) {
  const city = localStorage.getItem("city");
  if (!city) location.href = "index.html";
  loadPlaces(city);
}

async function loadPlaces(city) {
  const grid = document.getElementById("placesGrid");
  const title = document.getElementById("placeTitle");
  title.innerText = "Exploring " + city;
  grid.innerHTML = "Loading...";

  try {
    const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${city}&limit=1`);
    const geoData = await geoRes.json();
    if (!geoData[0]) throw new Error("Not found");

    const { lat, lon, type } = geoData[0];
    const radius = type === "country" ? 200000 : 50000;
    const query = `[out:json];(node(around:${radius},${lat},${lon})["tourism"];way(around:${radius},${lat},${lon})["tourism"];);out center;`;
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
    const data = await res.json();

    grid.innerHTML = "";
    if (!data.elements.length) {
      const key = city.toLowerCase().split(",")[0];
      famousPlaces[key]?.forEach(addCard);
      return;
    }
    data.elements.slice(0, 12).forEach(p => { if (p.tags?.name) addCard(p.tags.name); });
  } catch {
    const key = city.toLowerCase().split(",")[0];
    famousPlaces[key]?.forEach(addCard);
    grid.innerHTML = grid.innerHTML || "No places found";
  }
}

/***********************
 PLACE CARD
************************/
function addCard(name) {
  const price = Math.floor(Math.random() * 8000) + 3000;
  const grid = document.getElementById("placesGrid");
  grid.innerHTML += `<div class="place-card"><h3>${name}</h3><p>Estimated Cost: ₹${price}</p><button onclick="addToTrip('${name}',${price},this)">Add</button></div>`;
}

/***********************
 ADD TO CART
************************/
function addToTrip(name, price, btn) {
  if (cart.some(p => p.name === name)) return showToast(`⚠️ ${name} already added`);
  cart.push({ name, price });
  total += price;
  document.getElementById("total").innerText = total;
  btn.innerText = "Added ✓"; btn.disabled = true; btn.style.opacity = "0.7";
  showToast(`✅ ${name} added`);
}

/***********************
 BOOK TRIP
************************/
function bookTrip() {
  if (cart.length === 0) return alert("Add places first");
  localStorage.setItem("cart", JSON.stringify(cart));
  window.location.href = "confirm.html";
}

/***********************
 CONFIRM PAGE
************************/
if (location.pathname.includes("confirm.html")) loadConfirmPage();

function loadConfirmPage() {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const cartList = document.getElementById("cartList");
  const people = document.getElementById("people");
  const finalTotal = document.getElementById("finalTotal");

  function render() {
    cartList.innerHTML = "";
    if (cart.length === 0) { alert("No places selected"); location.href="places.html"; return; }
    cart.forEach((p,i)=>{
      const imgSrc = `https://source.unsplash.com/400x300/?${p.name.replace(/\s/g,"")},travel`;
      cartList.innerHTML += `<div class="cart-item"><img src="${imgSrc}" alt="${p.name}"><div class="cart-item-info"><h3>${p.name}</h3><p>₹${p.price}</p></div><button onclick="removePlace(${i})" class="remove-btn">Remove</button></div>`;
    });
    updateTotal();
  }

  function updateTotal() {
    const sum = cart.reduce((s,p)=>s+p.price,0);
    finalTotal.innerText = sum * people.value;
  }

  people.addEventListener("input", updateTotal);

  window.removePlace = function(i){ cart.splice(i,1); localStorage.setItem("cart",JSON.stringify(cart)); render(); }
  window.confirmBooking = function(){ localStorage.setItem("tickets", people.value); localStorage.setItem("finalPrice", finalTotal.innerText); alert(`🎉 Booking Confirmed!\nTotal ₹${finalTotal.innerText}`); location.href="ticket.html"; }

  render();
}

/***********************
 TOAST
************************/
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.innerText = msg;
  toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"), 2500);
}

/***********************
 PDF DOWNLOAD
************************/
function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(18); doc.text("Travel Ticket",20,20);
  doc.setFontSize(14);
  doc.text(`Destination: ${localStorage.getItem("city")}`,20,40);
  doc.text(`Tickets: ${localStorage.getItem("tickets")}`,20,50);
  doc.text(`Amount: ₹${localStorage.getItem("finalPrice")}`,20,60);
  doc.save("TravelTicket.pdf");
}
