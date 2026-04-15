const bridge = window.tripPlannerBridge;

const state = {
  appState: null,
  latestResult: null,
  latestFormInput: null,
};

const elements = {
  plannerForm: document.getElementById("plannerForm"),
  originInput: document.getElementById("originInput"),
  destinationInput: document.getElementById("destinationInput"),
  gasIntervalInput: document.getElementById("gasIntervalInput"),
  daysInput: document.getElementById("daysInput"),
  gasBrandsInput: document.getElementById("gasBrandsInput"),
  hotelBrandsInput: document.getElementById("hotelBrandsInput"),
  planButton: document.getElementById("planButton"),
  resetButton: document.getElementById("resetButton"),
  openMapsButton: document.getElementById("openMapsButton"),
  copyButton: document.getElementById("copyButton"),
  savePdfButton: document.getElementById("savePdfButton"),
  saveTextButton: document.getElementById("saveTextButton"),
  saveJsonButton: document.getElementById("saveJsonButton"),
  runtimePill: document.getElementById("runtimePill"),
  apiStatusCard: document.getElementById("apiStatusCard"),
  emptyState: document.getElementById("emptyState"),
  loadingState: document.getElementById("loadingState"),
  errorState: document.getElementById("errorState"),
  errorMessage: document.getElementById("errorMessage"),
  errorDetails: document.getElementById("errorDetails"),
  resultState: document.getElementById("resultState"),
  summaryGrid: document.getElementById("summaryGrid"),
  routeRibbon: document.getElementById("routeRibbon"),
  journeyRail: document.getElementById("journeyRail"),
  mapsPanel: document.getElementById("mapsPanel"),
  daysGrid: document.getElementById("daysGrid"),
  allGasStops: document.getElementById("allGasStops"),
  overnightStops: document.getElementById("overnightStops"),
  caveatsList: document.getElementById("caveatsList"),
  formattedItinerary: document.getElementById("formattedItinerary"),
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function splitBrands(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatMilesFromMeters(meters) {
  return `${Math.round(Number(meters || 0) / 1609.344)} mi`;
}

function formatDuration(seconds) {
  const totalMinutes = Math.round(Number(seconds || 0) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) {
    return `${minutes}m`;
  }

  if (!minutes) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function formatRating(rating, reviewCount) {
  if (!rating) {
    return "Rating unavailable";
  }

  if (!reviewCount) {
    return rating.toFixed(1);
  }

  return `${rating.toFixed(1)} (${Number(reviewCount).toLocaleString()} reviews)`;
}

function formatOffsetFromRoute(meters) {
  return `${formatMilesFromMeters(meters)} off route`;
}

function getOverallMapsUrl() {
  return state.latestResult?.itinerary?.maps?.overallUrl || "";
}

function setLoading(isLoading) {
  elements.planButton.disabled = isLoading;
  elements.resetButton.disabled = isLoading;
  elements.copyButton.disabled = isLoading || !state.latestResult;
  elements.openMapsButton.disabled = isLoading || !getOverallMapsUrl();
  elements.savePdfButton.disabled = isLoading || !state.latestResult;
  elements.saveTextButton.disabled = isLoading || !state.latestResult;
  elements.saveJsonButton.disabled = isLoading || !state.latestResult;
  elements.loadingState.classList.toggle("hidden", !isLoading);
}

function showSection(section) {
  elements.emptyState.classList.add("hidden");
  elements.errorState.classList.add("hidden");
  elements.resultState.classList.add("hidden");

  if (section === "empty") {
    elements.emptyState.classList.remove("hidden");
  }

  if (section === "error") {
    elements.errorState.classList.remove("hidden");
  }

  if (section === "result") {
    elements.resultState.classList.remove("hidden");
  }
}

function buildMetricCard(label, value, note) {
  return `
    <div class="metric-card">
      <div class="metric-term">${escapeHtml(label)}</div>
      <div class="metric-value">${escapeHtml(value)}</div>
      ${note ? `<div class="metric-note">${escapeHtml(note)}</div>` : ""}
    </div>
  `;
}

function renderApiStatus() {
  const { environment, runtime } = state.appState;
  const apiStatus = environment.apiKeyConfigured
    ? '<span class="status-indicator good">Ready</span>'
    : '<span class="status-indicator warn">Unavailable</span>';
  const runtimeLabel =
    runtime === "hosted-web"
      ? "Hosted app"
      : runtime === "web"
        ? "Local web"
        : runtime === "static-site"
          ? "Static shell"
          : "Desktop app";
  const copy = environment.apiKeyConfigured
    ? runtime === "hosted-web"
      ? "Trip planning is available."
      : runtime === "web"
        ? "Connected to your local setup."
        : "Ready to build trips from this machine."
    : runtime === "static-site"
      ? "This preview only shows the interface. Live planning is not available here."
    : runtime === "hosted-web"
      ? "Trip planning is temporarily unavailable."
    : runtime === "web"
      ? "Add your Google Maps key to .env before starting the web preview."
      : "Add your Google Maps key to .env before building a trip.";

  elements.runtimePill.textContent = runtimeLabel;

  if (runtime === "hosted-web") {
    elements.apiStatusCard.innerHTML = `
      <div class="status-row">
        <h3>Service status</h3>
        ${apiStatus}
      </div>
      <p>${escapeHtml(copy)}</p>
    `;
    return;
  }

  elements.apiStatusCard.innerHTML = `
    <div class="status-row">
      <h3>Service status</h3>
      ${apiStatus}
    </div>
    <p>${escapeHtml(copy)}</p>
    <dl class="status-list">
      <div>
        <dt>Runtime</dt>
        <dd>${escapeHtml(runtimeLabel)}</dd>
      </div>
      <div>
        <dt>Key source</dt>
        <dd>${escapeHtml(environment.envSourceLabel)}</dd>
      </div>
      <div>
        <dt>Enabled APIs</dt>
        <dd>${environment.requiredApis.map(escapeHtml).join(", ")}</dd>
      </div>
      <div>
        <dt>Region bias</dt>
        <dd>${escapeHtml(environment.regionCode)}</dd>
      </div>
    </dl>
  `;
}

function fillDefaults() {
  const defaults = state.appState.defaults;
  elements.originInput.value = defaults.origin;
  elements.destinationInput.value = defaults.destination;
  elements.gasIntervalInput.value = String(defaults.gasStopIntervalMiles);
  elements.daysInput.value = String(defaults.drivingDays);
  elements.gasBrandsInput.value = defaults.preferredGasBrands.join(", ");
  elements.hotelBrandsInput.value = defaults.preferredHotelBrands.join(", ");
}

function readFormInput() {
  return {
    origin: elements.originInput.value.trim(),
    destination: elements.destinationInput.value.trim(),
    gasStopIntervalMiles: Number(elements.gasIntervalInput.value),
    drivingDays: Number(elements.daysInput.value),
    preferredGasBrands: splitBrands(elements.gasBrandsInput.value),
    preferredHotelBrands: splitBrands(elements.hotelBrandsInput.value),
  };
}

function validateFormInput(input) {
  if (!input.origin || !input.destination) {
    throw new Error("Origin and destination are both required.");
  }

  if (input.origin.toLowerCase() === input.destination.toLowerCase()) {
    throw new Error("Origin and destination must be different.");
  }

  if (!Number.isInteger(input.gasStopIntervalMiles) || input.gasStopIntervalMiles < 100 || input.gasStopIntervalMiles > 600) {
    throw new Error("Fuel interval must be a whole number between 100 and 600 miles.");
  }

  if (!Number.isInteger(input.drivingDays) || input.drivingDays < 2 || input.drivingDays > 7) {
    throw new Error("Driving days must be a whole number between 2 and 7.");
  }

  if (!input.preferredGasBrands.length) {
    throw new Error("Add at least one preferred gas brand.");
  }

  if (!input.preferredHotelBrands.length) {
    throw new Error("Add at least one preferred hotel brand.");
  }
}

function renderRouteRibbon(result) {
  const { itinerary } = result;
  const routeStops = [
    {
      label: "Start",
      title: itinerary.summary.start,
      detail: "Departure point",
    },
    ...itinerary.overnightStops.map((stop, index) => ({
      label: `Night ${index + 1}`,
      title: stop.city,
      detail: `Around trip mile ${Math.round(stop.approxTripMiles)}`,
    })),
    {
      label: "Finish",
      title: itinerary.summary.end,
      detail: "Final destination",
    },
  ];

  elements.routeRibbon.innerHTML = `
    <div>
      <h2>${escapeHtml(itinerary.summary.start)} to ${escapeHtml(itinerary.summary.end)}</h2>
      <p class="route-summary">${escapeHtml(itinerary.summary.routeOverview)}</p>
    </div>
    <ol class="route-list">
      ${routeStops
        .map(
          (stop) => `
            <li>
              <div class="route-label">${escapeHtml(stop.label)}</div>
              <div class="route-value">
                <strong>${escapeHtml(stop.title)}</strong>
                <span class="meta">${escapeHtml(stop.detail)}</span>
              </div>
            </li>
          `,
        )
        .join("")}
    </ol>
  `;
}

function renderSummary(result) {
  const { itinerary } = result;
  elements.summaryGrid.innerHTML = [
    buildMetricCard("Total Distance", formatMilesFromMeters(itinerary.summary.totalDistanceMeters), `${itinerary.gasStops.length} fuel stops planned`),
    buildMetricCard("Drive Time", formatDuration(itinerary.summary.totalEstimatedDriveTimeSeconds), `${itinerary.summary.numberOfDrivingDays} driving days`),
    buildMetricCard("Overnights", String(itinerary.overnightStops.length), itinerary.overnightStops.map((stop) => stop.city).join(" • ") || "Destination on the last day"),
    buildMetricCard("Fuel Interval", `${itinerary.summary.gasStopIntervalMiles} mi`, `${itinerary.overnightStops.length ? itinerary.overnightStops.length : 0} overnight areas checked`),
  ].join("");
}

function renderJourneyRail(result) {
  const nodes = [
    {
      label: "Start",
      title: result.itinerary.summary.start,
      meta: "Departure point",
    },
    ...result.itinerary.overnightStops.map((stop, index) => ({
      label: `Night ${index + 1}`,
      title: stop.city,
      meta: `Around trip mile ${Math.round(stop.approxTripMiles)}`,
    })),
    {
      label: "Arrival",
      title: result.itinerary.summary.end,
      meta: "Final destination",
    },
  ];

  elements.journeyRail.innerHTML = `
    <div class="panel-heading">
      <div>
        <h3>Trip outline</h3>
      </div>
      <span>${escapeHtml(`${result.itinerary.days.length} days planned with ${result.itinerary.gasStops.length} fuel stops`)}</span>
    </div>
    <div class="journey-track">
      ${nodes
        .map(
          (node) => `
            <article class="journey-stop">
              <div class="journey-stop-label">${escapeHtml(node.label)}</div>
              <div class="journey-stop-title">${escapeHtml(node.title)}</div>
              <div class="meta">${escapeHtml(node.meta)}</div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderStackItems(items, emptyMessage, mapper) {
  if (!items.length) {
    return `<div class="stack-item"><strong>${escapeHtml(emptyMessage)}</strong></div>`;
  }

  return items.map(mapper).join("");
}

function renderGasStopItem(stop) {
  if (!stop.selectedStation) {
    return `
      <div class="stack-item">
        <strong>No strong stop returned</strong>
        <div class="meta">Around trip mile ${Math.round(stop.approxTripMiles)}</div>
      </div>
    `;
  }

  const station = stop.selectedStation;
  const brand = station.matchedBrand ? `${station.matchedBrand.brand} • ` : "";

  return `
    <div class="stack-item">
      <strong>${escapeHtml(station.name)}</strong>
      <div class="meta">
        ${escapeHtml(brand)}${escapeHtml(station.address)}<br />
        Around trip mile ${Math.round(stop.approxTripMiles)} • ${escapeHtml(formatRating(station.rating, station.userRatingCount))} • ${escapeHtml(formatOffsetFromRoute(station.detourDistanceMeters))}
      </div>
    </div>
  `;
}

function renderHotelItem(hotel) {
  const brand = hotel.matchedBrand ? `${hotel.matchedBrand.brand} • ` : "";

  return `
    <div class="stack-item">
      <strong>${escapeHtml(hotel.name)}</strong>
      <div class="meta">
        ${escapeHtml(brand)}${escapeHtml(hotel.address)}<br />
        ${escapeHtml(formatRating(hotel.rating, hotel.userRatingCount))} • ${escapeHtml(formatOffsetFromRoute(hotel.detourDistanceMeters))}
      </div>
    </div>
  `;
}

function renderMapsPanel(result) {
  const maps = result.itinerary.maps || { dayUrls: [] };
  const overallBlock = maps.overallUrl
    ? `
      <div class="maps-card">
        <h4>Full Route</h4>
        <p class="meta">Open the full route in Google Maps with the current stop order.</p>
        <button class="toolbar-button inline-map-button" type="button" data-maps-url="${escapeHtml(maps.overallUrl)}">
          Open Full Route in Google Maps
        </button>
      </div>
    `
    : `
      <div class="maps-card">
        <h4>Full Route</h4>
        <p class="meta">${escapeHtml(
          maps.overallUrlUnavailableReason ||
            "The full trip could not be turned into a single Google Maps directions link.",
        )}</p>
      </div>
    `;

  const dayLinksBlock = maps.dayUrls.length
    ? maps.dayUrls
        .map((dayLink) => {
          if (!dayLink.url) {
            return `
              <div class="stack-item">
                <strong>Day ${dayLink.dayNumber}</strong>
                <div class="meta">${escapeHtml(dayLink.unavailableReason || "Google Maps link unavailable.")}</div>
              </div>
            `;
          }

          return `
            <div class="stack-item">
              <strong>Day ${dayLink.dayNumber}</strong>
              <div class="meta">${escapeHtml(dayLink.label)}</div>
              <button class="toolbar-button inline-map-button" type="button" data-maps-url="${escapeHtml(dayLink.url)}">
                Open Day ${dayLink.dayNumber}
              </button>
            </div>
          `;
        })
        .join("")
    : '<div class="stack-item"><strong>No Google Maps links available.</strong></div>';

  elements.mapsPanel.innerHTML = `
    <div class="panel-heading">
      <div>
        <h3>Google Maps</h3>
      </div>
      <span>${escapeHtml(
        maps.mobileWaypointNote ||
          "Use the full route link or send a single day to your phone.",
      )}</span>
    </div>

    <div class="maps-grid">
      ${overallBlock}
      <div class="maps-card">
        <h4>Day-by-Day Links</h4>
        <div class="stack-list">${dayLinksBlock}</div>
      </div>
    </div>
  `;
}

function renderDays(result) {
  elements.daysGrid.innerHTML = result.itinerary.days
    .map((day) => {
      const dayMapLink = result.itinerary.maps?.dayUrls?.find((item) => item.dayNumber === day.dayNumber) || null;

      return `
        <article class="day-card">
          <div class="day-header">
            <div>
              <div class="day-number">Day ${day.dayNumber}</div>
              <h3 class="day-title">${escapeHtml(day.startLocation)} to ${escapeHtml(day.endLocation)}</h3>
              <div class="day-route">${escapeHtml(day.mainRouteOverview)}</div>
            </div>
            <div class="day-side">
              <div class="day-stats">
                <div>${escapeHtml(formatMilesFromMeters(day.estimatedMiles))}</div>
                <div>${escapeHtml(formatDuration(day.estimatedDrivingTime))}</div>
              </div>
              ${
                dayMapLink?.url
                  ? `<button class="toolbar-button inline-map-button" type="button" data-maps-url="${escapeHtml(dayMapLink.url)}">Open in Google Maps</button>`
                  : `<div class="meta inline-note">${escapeHtml(dayMapLink?.unavailableReason || "Google Maps link unavailable for this day.")}</div>`
              }
            </div>
          </div>

          <div class="day-body">
            <section class="subcard">
              <h4>Recommended Gas Stops</h4>
              <div class="stack-list">
                ${renderStackItems(day.gasStops, "No scheduled gas stop on this segment; start the day topped off.", renderGasStopItem)}
              </div>
            </section>

            <section class="subcard">
              <h4>${day.dayNumber === result.itinerary.days.length ? "Arrival Notes" : "Hotel Options"}</h4>
              <div class="stack-list">
                ${
                  day.hotelOptions.length
                    ? day.hotelOptions.map(renderHotelItem).join("")
                    : '<div class="stack-item"><strong>No overnight stay needed</strong><div class="meta">This is the arrival day into your destination.</div></div>'
                }
              </div>
            </section>
          </div>

          <section class="subcard">
            <h4>Notes</h4>
            <ul class="notes-list">
              ${day.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
            </ul>
          </section>
        </article>
      `;
    })
    .join("");
}

function renderAllStops(result) {
  elements.allGasStops.innerHTML = renderStackItems(
    result.itinerary.gasStops,
    "No gas stops were planned.",
    renderGasStopItem,
  );

  elements.overnightStops.innerHTML = renderStackItems(
    result.itinerary.overnightStops,
    "No overnight stops were planned.",
    (stop) => `
      <div class="stack-item">
        <strong>${escapeHtml(stop.city)}</strong>
        <div class="meta">Around trip mile ${Math.round(stop.approxTripMiles)} • ${stop.hotelOptions.length} hotel picks</div>
      </div>
    `,
  );

  elements.caveatsList.innerHTML = result.itinerary.caveats.length
    ? `<ul class="plain-list">${result.itinerary.caveats.map((caveat) => `<li>${escapeHtml(caveat)}</li>`).join("")}</ul>`
    : '<div class="stack-item"><strong>No caveats reported.</strong></div>';

  elements.formattedItinerary.textContent = result.formattedItinerary;
}

function renderResult(result) {
  state.latestResult = result;
  renderRouteRibbon(result);
  renderSummary(result);
  renderJourneyRail(result);
  renderMapsPanel(result);
  renderDays(result);
  renderAllStops(result);
  showSection("result");
  elements.copyButton.disabled = false;
  elements.openMapsButton.disabled = !result.itinerary.maps?.overallUrl;
  elements.savePdfButton.disabled = false;
  elements.saveTextButton.disabled = false;
  elements.saveJsonButton.disabled = false;
}

function renderError(message, details) {
  elements.errorMessage.textContent = message;

  if (details) {
    elements.errorDetails.textContent = JSON.stringify(details, null, 2);
    elements.errorDetails.classList.remove("hidden");
  } else {
    elements.errorDetails.textContent = "";
    elements.errorDetails.classList.add("hidden");
  }

  showSection("error");
}

async function handlePlanSubmit(event) {
  event.preventDefault();

  try {
    const input = readFormInput();
    validateFormInput(input);
    state.latestFormInput = input;
    state.latestResult = null;
    setLoading(true);
    showSection("empty");

    const result = await bridge.planTrip(input);

    if (!result.ok) {
      throw Object.assign(new Error(result.error.message), { details: result.error.details });
    }

    renderResult(result);
  } catch (error) {
    renderError(error.message || "Unknown error", error.details || null);
  } finally {
    setLoading(false);
  }
}

async function initialize() {
  state.appState = await bridge.getAppState();
  renderApiStatus();
  fillDefaults();
  showSection("empty");
}

elements.plannerForm.addEventListener("submit", handlePlanSubmit);
elements.resetButton.addEventListener("click", () => {
  fillDefaults();
});

elements.copyButton.addEventListener("click", async () => {
  if (!state.latestResult) {
    return;
  }

  await bridge.copyText(state.latestResult.formattedItinerary);
});

elements.openMapsButton.addEventListener("click", async () => {
  const overallMapsUrl = getOverallMapsUrl();

  if (!overallMapsUrl) {
    return;
  }

  await bridge.openExternalUrl(overallMapsUrl);
});

elements.savePdfButton.addEventListener("click", async () => {
  if (!state.latestResult || !state.latestFormInput) {
    return;
  }

  await bridge.savePdf({
    origin: state.latestFormInput.origin,
    destination: state.latestFormInput.destination,
    itinerary: state.latestResult.itinerary,
    formattedItinerary: state.latestResult.formattedItinerary,
  });
});

elements.saveTextButton.addEventListener("click", async () => {
  if (!state.latestResult || !state.latestFormInput) {
    return;
  }

  await bridge.saveText({
    origin: state.latestFormInput.origin,
    destination: state.latestFormInput.destination,
    text: state.latestResult.formattedItinerary,
  });
});

elements.saveJsonButton.addEventListener("click", async () => {
  if (!state.latestResult || !state.latestFormInput) {
    return;
  }

  await bridge.saveJson({
    origin: state.latestFormInput.origin,
    destination: state.latestFormInput.destination,
    itinerary: state.latestResult.itinerary,
  });
});

document.addEventListener("click", async (event) => {
  const trigger = event.target.closest("[data-maps-url]");

  if (!trigger) {
    return;
  }

  const url = trigger.getAttribute("data-maps-url");

  if (!url) {
    return;
  }

  await bridge.openExternalUrl(url);
});

initialize().catch((error) => {
  renderError(error.message || "Failed to start the app.", error.details || null);
});
