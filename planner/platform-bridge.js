(function bootstrapPlatformBridge() {
  if (window.tripPlannerBridge) {
    return;
  }

  const staticPreviewAppState = {
    defaults: {
      origin: "Las Vegas, NV",
      destination: "Greensboro, NC",
      gasStopIntervalMiles: 300,
      drivingDays: 3,
      preferredGasBrands: [
        "Love's",
        "Pilot",
        "Flying J",
        "TravelCenters of America",
        "TA",
        "QuikTrip",
        "RaceTrac",
        "Chevron",
        "Shell",
        "Exxon",
        "BP",
        "Murphy USA",
        "Circle K",
        "Buc-ee's",
        "Speedway",
        "Valero",
        "Sunoco",
        "7-Eleven",
      ],
      preferredHotelBrands: [
        "Drury Inn & Suites",
        "Hyatt Place",
        "Hampton Inn",
        "Holiday Inn Express",
        "Fairfield Inn",
        "Courtyard",
        "La Quinta",
        "Best Western Plus",
        "SpringHill Suites",
        "Home2 Suites",
        "Tru by Hilton",
        "Residence Inn",
        "TownePlace Suites",
        "Comfort Suites",
      ],
    },
    environment: {
      apiKeyConfigured: false,
      envSourceLabel: "Static shell only",
      envSourceDetail:
        "This static build ships the interface only. Live planning needs the desktop app, local web server, or a hosted backend with /api routes.",
      regionCode: "US",
      requiredApis: ["Routes API", "Places API (New)"],
    },
    runtime: "static-site",
  };
  const hostedPlannerBaseUrl = "https://wayline.vercel.app/planner/";

  function slugify(value) {
    return String(value || "road-trip")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  async function readJson(response) {
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : null;

    if (!response.ok) {
      throw new Error(payload?.error?.message || payload?.message || `Request failed with status ${response.status}.`);
    }

    return payload;
  }

  function buildHostedPlannerUrl(payload = {}) {
    const url = new URL(hostedPlannerBaseUrl);

    if (payload.origin) {
      url.searchParams.set("origin", payload.origin);
    }

    if (payload.destination) {
      url.searchParams.set("destination", payload.destination);
    }

    if (payload.gasStopIntervalMiles) {
      url.searchParams.set("gasIntervalMiles", String(payload.gasStopIntervalMiles));
    }

    if (payload.drivingDays) {
      url.searchParams.set("drivingDays", String(payload.drivingDays));
    }

    if (Array.isArray(payload.preferredGasBrands) && payload.preferredGasBrands.length) {
      url.searchParams.set("gasBrands", payload.preferredGasBrands.join(", "));
    }

    if (Array.isArray(payload.preferredHotelBrands) && payload.preferredHotelBrands.length) {
      url.searchParams.set("hotelBrands", payload.preferredHotelBrands.join(", "));
    }

    return url.toString();
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 2000);
  }

  function openPrintWindow(payload) {
    const jobId = `wayline-print-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const printUrl = new URL("./print.html", window.location.href);
    printUrl.searchParams.set("job", jobId);
    printUrl.searchParams.set("auto", "1");
    sessionStorage.setItem(jobId, JSON.stringify(payload));
    const printWindow = window.open(printUrl.toString(), "_blank", "noopener,noreferrer");

    if (!printWindow) {
      sessionStorage.removeItem(jobId);
      throw new Error("The browser blocked the print preview window.");
    }
  }

  window.tripPlannerBridge = {
    async getAppState() {
      try {
        const response = await fetch("/api/app-state", {
          headers: {
            Accept: "application/json",
          },
        });

        const payload = await readJson(response);
        return payload?.defaults && payload?.environment ? payload : staticPreviewAppState;
      } catch (_error) {
        return staticPreviewAppState;
      }
    },

    async planTrip(payload) {
      try {
        const response = await fetch("/api/plan-trip", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const payload = await readJson(response);

        if (payload?.ok !== undefined) {
          return payload;
        }

        throw new Error("Planner backend unavailable.");
      } catch (_error) {
        if (window.location.hostname.endsWith("github.io")) {
          window.location.replace(buildHostedPlannerUrl(payload));

          return {
            ok: false,
            error: {
              message: "Opening the live planner.",
              details: null,
            },
          };
        }

        return {
          ok: false,
          error: {
            message: "This preview cannot build trips.",
            details: null,
          },
        };
      }
    },

    async saveText(payload) {
      downloadBlob(
        new Blob([`${payload.text || ""}\n`], { type: "text/plain;charset=utf-8" }),
        `${slugify(`${payload.origin}-to-${payload.destination}`)}.txt`,
      );

      return { canceled: false };
    },

    async saveJson(payload) {
      downloadBlob(
        new Blob([`${JSON.stringify(payload.itinerary, null, 2)}\n`], { type: "application/json;charset=utf-8" }),
        `${slugify(`${payload.origin}-to-${payload.destination}`)}.json`,
      );

      return { canceled: false };
    },

    async savePdf(payload) {
      openPrintWindow(payload);
      return { canceled: false };
    },

    async copyText(text) {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text || "");
        return { ok: true };
      }

      const textArea = document.createElement("textarea");
      textArea.value = text || "";
      document.body.append(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
      return { ok: true };
    },

    async showEnvFiles() {
      window.open("/backend/", "_blank", "noopener,noreferrer");
      return { ok: true };
    },

    async openExternalUrl(url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return { ok: true };
    },
  };
})();
