const findButton = document.getElementById("findProviders");
const resultsDiv = document.getElementById("providerResults");

// 🔹 Click Event
findButton.addEventListener("click", () => {
  getUserLocationAndProcess();
});

// 🔹 STEP 1: Get User Location FIRST
function getUserLocationAndProcess() {
  navigator.geolocation.getCurrentPosition(
    position => {
      const userLat = position.coords.latitude;
      const userLon = position.coords.longitude;

      const providers = getProviders(); // hard-coded for demo
      processProviders(providers, userLat, userLon);
    },
    () => {
      // fallback if location denied
      console.warn("Geolocation blocked, using default location");
      const providers = getProviders();
      processProviders(providers, 35.7796, -78.6382);
    }
  );
}

/////////////////////////////////////////////////////////
// 🔹 HARD-CODED DATA (DEMO MODE)
// 🔹 Later replace this with FHIR fetch
/////////////////////////////////////////////////////////

function getProviders() {
  return [
    {
      id: "1",
      name: "Dr. Sarah Smith",
      specialty: "Cardiology",
      acceptedPlans: ["BlueCross", "Aetna"],
      availableSoon: true,
      location: { lat: 35.78, lon: -78.64 }
    },
    {
      id: "2",
      name: "Dr. Michael Johnson",
      specialty: "Cardiology",
      acceptedPlans: ["United"],
      availableSoon: false,
      location: { lat: 35.75, lon: -78.70 }
    },
    {
      id: "3",
      name: "Dr. Priya Patel",
      specialty: "Dermatology",
      acceptedPlans: ["BlueCross"],
      availableSoon: true,
      location: { lat: 35.80, lon: -78.60 }
    },
    {
      id: "4",
      name: "Dr. David Lee",
      specialty: "Cardiology",
      acceptedPlans: ["BlueCross"],
      availableSoon: true,
      location: { lat: 35.77, lon: -78.63 }
    }
  ];
}

/////////////////////////////////////////////////////////
// 🔹 FUTURE: FHIR CONNECTION (NOT ACTIVE YET)
/////////////////////////////////////////////////////////

function fetchProvidersFromFHIR() {
  return fetch("https://hapi.fhir.org/baseR4/Practitioner")
    .then(res => res.json())
    .then(data => mapFHIRPractitioners(data));
}

// Example mapping (for future use)
function mapFHIRPractitioners(data) {
  return data.entry.map(entry => {
    const resource = entry.resource;

    return {
      id: resource.id,
      name: formatName(resource.name),
      specialty: "Cardiology", // would use PractitionerRole
      acceptedPlans: ["BlueCross"],
      availableSoon: true,
      location: { lat: 35.7796, lon: -78.6382 }
    };
  });
}

// Fix name parsing
function formatName(nameArray) {
  if (!nameArray || nameArray.length === 0) return "Unknown";

  const name = nameArray[0];
  const given = name.given ? name.given.join(" ") : "";
  const family = name.family || "";

  return (given + " " + family).trim() || "Unknown";
}

/////////////////////////////////////////////////////////
// 🔹 PROCESS + RANK
/////////////////////////////////////////////////////////

function processProviders(providers, userLat, userLon) {
  const specialty = document.getElementById("specialty").value;
  const insurance = document.getElementById("insurance").value;

  const ranked = providers
    .filter(doc => doc.specialty === specialty)
    .map(doc => ({
      ...doc,
      score: rankDoctor(doc, insurance, specialty, userLat, userLon)
    }))
    .sort((a, b) => b.score - a.score);

  displayProviders(ranked, insurance, userLat, userLon);
}

/////////////////////////////////////////////////////////
// 🔹 RANKING (WITH LOCATION)
/////////////////////////////////////////////////////////

function rankDoctor(doc, insurance, specialty, userLat, userLon) {
  let score = 0;

  if (doc.specialty === specialty) score += 5;
  if (doc.acceptedPlans.includes(insurance)) score += 5;
  if (doc.availableSoon) score += 3;

  const distance = calculateDistance(
    userLat,
    userLon,
    doc.location.lat,
    doc.location.lon
  );

  if (distance < 10) score += 5;
  else if (distance < 25) score += 3;
  else score += 1;

  return score;
}

/////////////////////////////////////////////////////////
// 🔹 DISTANCE FUNCTION
/////////////////////////////////////////////////////////

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/////////////////////////////////////////////////////////
// 🔹 DISPLAY
/////////////////////////////////////////////////////////

function displayProviders(providers, insurance, userLat, userLon) {
  resultsDiv.innerHTML = "";

  if (providers.length === 0) {
    resultsDiv.innerHTML = "<p>No providers found.</p>";
    return;
  }

  providers.forEach(doc => {
    const distance = calculateDistance(
      userLat,
      userLon,
      doc.location.lat,
      doc.location.lon
    ).toFixed(1);

    const div = document.createElement("div");
    div.className = "provider-card";

    const networkStatus = doc.acceptedPlans.includes(insurance)
      ? `<span class="in-network">In Network</span>`
      : `<span class="out-network">Out of Network</span>`;

    div.innerHTML = `
      <h3>${doc.name}</h3>
      <p>Specialty: ${doc.specialty}</p>
      <p>${networkStatus}</p>
      <p>Distance: ${distance} km</p>
      <p>Score: ${doc.score}</p>
      <button onclick="createReferral('${doc.id}')">Send Referral</button>
    `;

    resultsDiv.appendChild(div);
  });
}

/////////////////////////////////////////////////////////
// 🔹 REFERRAL (SIMULATED FOR DEMO)
/////////////////////////////////////////////////////////

function createReferral(practitionerId) {
  alert("Referral sent to provider ID: " + practitionerId);

  // FUTURE: Replace with real FHIR POST
}
