(function bootstrapPrintView() {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

  function renderGasStop(stop) {
    if (!stop.selectedStation) {
      return `
        <div class="list-item">
          <strong>No strong fuel stop returned</strong>
          <p>Around trip mile ${Math.round(stop.approxTripMiles)}</p>
        </div>
      `;
    }

    const station = stop.selectedStation;
    const brand = station.matchedBrand ? `${station.matchedBrand.brand} • ` : "";

    return `
      <div class="list-item">
        <strong>${escapeHtml(station.name)}</strong>
        <p>${escapeHtml(brand)}${escapeHtml(station.address)}</p>
        <p>Around trip mile ${Math.round(stop.approxTripMiles)} • ${escapeHtml(formatRating(station.rating, station.userRatingCount))} • ${escapeHtml(formatOffsetFromRoute(station.detourDistanceMeters))}</p>
      </div>
    `;
  }

  function renderHotel(hotel) {
    const brand = hotel.matchedBrand ? `${hotel.matchedBrand.brand} • ` : "";

    return `
      <div class="list-item">
        <strong>${escapeHtml(hotel.name)}</strong>
        <p>${escapeHtml(brand)}${escapeHtml(hotel.address)}</p>
        <p>${escapeHtml(formatRating(hotel.rating, hotel.userRatingCount))} • ${escapeHtml(formatOffsetFromRoute(hotel.detourDistanceMeters))}</p>
      </div>
    `;
  }

  function renderDay(day, totalDays) {
    return `
      <article class="day-card">
        <div class="day-top">
          <div>
            <div class="micro">Day ${day.dayNumber}</div>
            <h3>${escapeHtml(day.startLocation)} to ${escapeHtml(day.endLocation)}</h3>
            <p class="day-route">${escapeHtml(day.mainRouteOverview)}</p>
          </div>
          <div class="chip-row">
            <span class="chip">${escapeHtml(formatMilesFromMeters(day.estimatedMiles))}</span>
            <span class="chip">${escapeHtml(formatDuration(day.estimatedDrivingTime))}</span>
          </div>
        </div>

        <div class="day-grid">
          <section class="section-panel">
            <h4>Fuel stops</h4>
            ${
              day.gasStops.length
                ? day.gasStops.map(renderGasStop).join("")
                : '<div class="list-item"><strong>No scheduled stop</strong><p>Start the day topped off.</p></div>'
            }
          </section>

          <section class="section-panel">
            <h4>${day.dayNumber === totalDays ? "Arrival" : "Hotel options"}</h4>
            ${
              day.hotelOptions.length
                ? day.hotelOptions.map(renderHotel).join("")
                : '<div class="list-item"><strong>No overnight stay needed</strong><p>This is the arrival day into the destination.</p></div>'
            }
          </section>
        </div>

        <section class="section-panel">
          <h4>Notes</h4>
          <ul class="plain-list">
            ${day.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
          </ul>
        </section>
      </article>
    `;
  }

  function renderDocument(payload) {
    const itinerary = payload.itinerary;

    return `
      <header class="print-head">
        <div>
          <div class="brand"><span class="brand-mark"></span>Wayline</div>
          <div class="micro">Road trip itinerary</div>
          <h1>${escapeHtml(itinerary.summary.start)} to ${escapeHtml(itinerary.summary.end)}</h1>
          <p>${escapeHtml(itinerary.summary.routeOverview)}</p>
        </div>
        <div class="chip-row">
          <span class="chip">${escapeHtml(formatMilesFromMeters(itinerary.summary.totalDistanceMeters))}</span>
          <span class="chip">${escapeHtml(formatDuration(itinerary.summary.totalEstimatedDriveTimeSeconds))}</span>
          <span class="chip">${escapeHtml(`${itinerary.summary.numberOfDrivingDays} days`)}</span>
        </div>
      </header>

      <section class="summary-grid">
        <article class="metric-card">
          <div class="micro">Distance</div>
          <strong>${escapeHtml(formatMilesFromMeters(itinerary.summary.totalDistanceMeters))}</strong>
          <p>${escapeHtml(itinerary.gasStops.length)} fuel stops planned</p>
        </article>
        <article class="metric-card">
          <div class="micro">Drive time</div>
          <strong>${escapeHtml(formatDuration(itinerary.summary.totalEstimatedDriveTimeSeconds))}</strong>
          <p>${escapeHtml(`${itinerary.summary.numberOfDrivingDays} driving days`)}</p>
        </article>
        <article class="metric-card">
          <div class="micro">Overnights</div>
          <strong>${escapeHtml(String(itinerary.overnightStops.length))}</strong>
          <p>${escapeHtml(itinerary.overnightStops.map((stop) => stop.city).join(" • ") || "Destination on the last day")}</p>
        </article>
        <article class="metric-card">
          <div class="micro">Fuel interval</div>
          <strong>${escapeHtml(`${itinerary.summary.gasStopIntervalMiles} mi`)}</strong>
          <p>Google Maps links included</p>
        </article>
      </section>

      <section class="section">
        <h2>Day-by-day plan</h2>
        ${itinerary.days.map((day) => renderDay(day, itinerary.days.length)).join("")}
      </section>

      <section class="section">
        <h2>Notes and caveats</h2>
        ${
          itinerary.caveats.length
            ? `<div class="section-panel"><ul class="plain-list">${itinerary.caveats.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`
            : '<div class="section-panel"><p class="empty-note">No caveats were reported for this trip.</p></div>'
        }
      </section>

      <section class="section">
        <h2>Text copy</h2>
        <pre class="mono-block">${escapeHtml(payload.formattedItinerary || "")}</pre>
      </section>
    `;
  }

  const printRoot = document.getElementById("printRoot");
  const printButton = document.getElementById("printButton");
  const closeButton = document.getElementById("closeButton");
  const searchParams = new URLSearchParams(window.location.search);
  const jobId = searchParams.get("job");
  const autoPrint = searchParams.get("auto") === "1";

  function renderEmpty(message) {
    printRoot.innerHTML = `<div class="section-panel"><p class="empty-note">${escapeHtml(message)}</p></div>`;
  }

  if (!jobId) {
    renderEmpty("The print preview data was not found.");
  } else {
    const rawPayload = sessionStorage.getItem(jobId);

    if (!rawPayload) {
      renderEmpty("The print preview expired. Go back to Wayline and try again.");
    } else {
      try {
        const payload = JSON.parse(rawPayload);
        printRoot.innerHTML = renderDocument(payload);
        sessionStorage.removeItem(jobId);

        if (autoPrint) {
          window.setTimeout(() => {
            window.print();
          }, 250);
        }
      } catch (error) {
        renderEmpty(error.message || "Could not render the print preview.");
      }
    }
  }

  printButton.addEventListener("click", () => {
    window.print();
  });

  closeButton.addEventListener("click", () => {
    window.close();
  });
})();
