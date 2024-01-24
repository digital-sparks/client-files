mapboxgl.accessToken =
  "pk.eyJ1IjoidGhlb2xvdmVzeW91IiwiYSI6ImNscWY3cjZ4ZzBzbGsya21lM241eXBrYWQifQ.xnf8KbblDRGFA46d3AVCYg";

const mapboxElement = document.querySelector(".mapbox_element"),
  mapboxGeocoderElement = document.querySelector(".mapbox_geocoder"),
  mapboxPopupElement = document.querySelector(".mapbox_popup"),
  mapboxLocations = document.querySelector(".mapbox_locations"),
  heartIconUrl = "https://uploads-ssl.webflow.com/655bd281fc14ada10f6e6f19/65a980a06e1aac8ecb83b688_Heart%202.png",
  heartIconSizeMultiplier = 0.6, // change this number to increase / descrease the size of the heart
  mapboxStoreContainer = document.querySelector(".mapbox_stores"),
  mapboxStoreWrapper = document.querySelector(".mapbox_store-list"),
  mapboxStoreSlide = document.querySelector(".mapbox_store-item");

  gsap.set(mapboxLocations, { yPercent: 100, opacity: 0 });
  gsap.set(mapboxPopupElement, { yPercent: 2.5, opacity: 0, display: "none" });

let geoJSON = {
  name: "TheoStores",
  type: "FeatureCollection",
  features: [],
};
let currentStore = "";
let highlightedHeartIcon = false;
let highlightedHeartIconIndex;
let isFound = false;
let showLocationBar = false;
let mapDefaultCenter = [4.483653838353578, 51.8991766692686];
let mapDefaultZoom = 4;
let map, fHover;

// load all stores on page through Finsweet Load Attribute
window.fsAttributes = window.fsAttributes || [];
window.fsAttributes.push([
  "cmsload",
  (listInstances) => {
    const [listInstance] = listInstances;

    listInstance.items.forEach((item, i) => {
      const storeName = item.element.getAttribute("store-name"),
        storeAddress = item.element.getAttribute("store-address"),
        storeAddress2 = item.element.getAttribute("store-address2"),
        storeCity = item.element.getAttribute("store-city"),
        storeCounty = item.element.getAttribute("store-country"),
        storeZip = item.element.getAttribute("store-zip"),
        storeSize = item.element.getAttribute("store-size"),
        storePhone = item.element.getAttribute("store-phone"),
        storeWebsite = item.element.getAttribute("store-website"),
        storeUrl = item.element.getAttribute("store-url"),
        storeLng = item.element.getAttribute("store-lng"),
        storeLat = item.element.getAttribute("store-lat");

      geoJSON.features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [storeLng, storeLat] },
        properties: {
          size:
            ((((storeSize - 1) * (5 - 2)) / (5 - 1) + 2) / 10) *
            heartIconSizeMultiplier,
          name: storeName,
          address: storeAddress,
          address2: storeAddress2,
          city: storeCity,
          zip: storeZip,
          country: storeCounty,
          phone: storePhone,
          website: storeWebsite,
          url: storeUrl,
        },
      });
    });

    console.log("stores loaded succesfully");

    // Settings for the Mapbox Map element
    map = new mapboxgl.Map({
      fadeDuration: 200,
      container: mapboxElement,
      style: "mapbox://styles/theolovesyou/clqf9v4uu00ir01qw8tjn5nbv",
      center: mapDefaultCenter,
      projection: "globe",
      zoom: mapDefaultZoom,
      maxZoom: 20,
      minZoom: 2.5,
      performanceMetricsCollection: false,
      // hash: true,
    });

    // Settings for the Mapbox Geocoder element
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      flyTo: true,
      placeholder: "Search for a location",
      clearAndBlurOnEsc: true,
      limit: 8,
      marker: false,
      enableGeolocation: true,
    });

    mapboxGeocoderElement.appendChild(geocoder.onAdd(map));

    // Once map is loaded, do the following...
    map.on("load", () => {
      // console.log("mapbox loaded succesfully");

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            mapDefaultCenter = [
              position.coords.longitude,
              position.coords.latitude,
            ];
            mapDefaultZoom = 11;

            map.flyTo({
              center: mapDefaultCenter,
              zoom: 11,
              essential: true,
            });
          },
          (error) => {},
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      }

      map.loadImage(heartIconUrl, (error, image) => {
        console.log("heart icon loaded succesfully");

        if (error) throw error;
        map.addImage("custom-marker", image);

        map.addSource("stores", {
          type: "geojson",
          generateId: true,
          data: geoJSON,
          cluster: true,
          clusterMaxZoom: 12,
          clusterRadius: 128,
          clusterMinPoints: 4,
        });

        map.addSource("hidden-stores", {
          type: "geojson",
          generateId: true,
          data: geoJSON,
        });

        map.addLayer({
          id: "clusters",
          source: "stores",
          type: "symbol",
          filter: ["has", "point_count"],
          layout: {
            "icon-image": "custom-marker",
            "icon-size": 0.5 * heartIconSizeMultiplier,
            "icon-allow-overlap": true,
          },
          paint: {
            "icon-opacity-transition": {
              duration: 500,
            },
          },
        });

        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "stores",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-font" : ["Neue Plak SemiBold", "Open Sans Semibold", "Arial Unicode MS Regular"],
            "text-size": 16,
            "text-offset": [0, -.25],
          },
          paint: {
            "text-color": "#ffffff",
          },
        });

        map.addLayer({
          id: "hidden-locations",
          type: "circle",
          source: "hidden-stores",
          maxZoom: 24,
          minZoom: 0,
          paint: {
            "circle-radius": 0, // this makes the layer invisible
          },
        });

        map.addLayer({
          id: "stores",
          source: "stores",
          type: "symbol",
          filter: ["!", ["has", "point_count"]],
          layout: {
            "icon-allow-overlap": true,
            "icon-image": "custom-marker",
            "icon-size": ["get", "size"],
          },
          paint: {
            "icon-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              0.5,
              1,
            ],
            "icon-opacity-transition": {
              duration: 500,
            },
          },
        });

        map.on("styledata", (e) => {
          setTimeout(function () {
            const features = map.queryRenderedFeatures({
              layers: ["hidden-locations"],
            });
            renderListings(features);
          }, 50);
        });
      });

      map.on("click", "clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        });
        const clusterId = features[0].properties.cluster_id;
        map
          .getSource("stores")
          .getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            map.easeTo({
              center: features[0].geometry.coordinates,
              zoom: zoom + 2,
            });
          });
      });

      map.on("click", "stores", (e) => {
        populatePopup(e.features[0]);

        if(highlightedHeartIcon && showLocationBar) {
          const features = map.queryRenderedFeatures({
            layers: ["hidden-locations"],
          });
          for (feature of features) {
            if (e.features[0].id !== feature.id) {
              map.setFeatureState(
                {
                  source: "stores",
                  id: feature.id,
                },
                {
                  hover: true,
                }
              );
            }
          }
        }

        highlightedHeartIcon = true;
        highlightedHeartIconIndex = e.features[0].id;
      });

      map.on("mouseenter", "clusters", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "clusters", () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("mousemove", "stores", function (e) {
        if (e.features[0]) {
          iconHoverIn(e.features[0]);
        } else {
          iconHoverOut();
        }
      });

      map.on("mouseout", "stores", function (e) {
        iconHoverOut();
      });

      function iconHoverIn(feature) {
        map.getCanvasContainer().style.cursor = "pointer";

        if (showLocationBar) {

          fHover = feature;
          highlightIcon(feature)

          const activeSlide = document.querySelector(`.mapbox_store-item[data-icon-id="${fHover.id}"]`);

          if (activeSlide) {
            activeSlide.style.opacity = 1;

            storeSwiper.slides.forEach((slide, i) => {
              if (slide !== activeSlide) slide.style.opacity = 0.4;
            });
          }
        }
      }

      function iconHoverOut() {
        if (!fHover) return;
        map.getCanvasContainer().style.cursor = "default";

        const features = map.queryRenderedFeatures({
          layers: ["hidden-locations"],
        });

        storeSwiper.slides.forEach((slide, i) => {
          slide.style.opacity = 1;
        });

        if (!highlightedHeartIcon) {
          for (feature of features) {
            map.setFeatureState(
              {
                source: "stores",
                id: feature.id,
              },
              {
                hover: false,
              }
            );
          }
        } else if (fHover.id !== highlightedHeartIconIndex) {
          map.setFeatureState(
            {
              source: "stores",
              id: fHover.id,
            },
            {
              hover: true,
            }
          );
        }

        fHover = null;
      }

      map.on("zoomend", showStoreLocator).on("moveend", showStoreLocator);
      map.on("zoomstart", hidePopup).on("movestart", hidePopup);

      function showStoreLocator() {

        setTimeout(function () {
          if (map.queryRenderedFeatures({ layers: ["clusters"] }).length >= 1) {
            showLocationBar = false;
            gsap.to(mapboxLocations, {
              yPercent: 100,
              opacity: 0,
              duration: 0.4,
              overwrite: true,
            });
          } else {

            showLocationBar = true;

            const features = map.queryRenderedFeatures({
              layers: ["hidden-locations"],
            });
            if (features) {
              renderListings(features);
            }

            // if(!showLocationBar) {
            //   gsap.to(mapboxLocations, {
            //     yPercent: 0,
            //     opacity: 1,
            //     duration: 0.6,
            //     overwrite: true,
            //   });
            // }


          }

          // gsap.to(mapboxPopupElement, {
          //   marginBottom: showLocationBar ? 0 : -mapboxLocations.clientHeight,
          // });
        }, 450);
      }
    });
  },
]);

function getUniqueFeatures(features, comparatorProperty) {
  const uniqueIds = new Set();
  const uniqueFeatures = [];
  for (const feature of features) {
    const id = feature.properties[comparatorProperty];
    if (!uniqueIds.has(id)) {
      uniqueIds.add(id);
      uniqueFeatures.push(feature);
    }
  }
  return uniqueFeatures;
}

function hidePopup() {
  highlightedHeartIcon = false;
  highlightedHeartIconIndex = null;
  const features = map.queryRenderedFeatures({
    layers: ["hidden-locations"],
  });
  for (feature of features) {
    map.setFeatureState(
      {
        source: "stores",
        id: feature.id,
      },
      {
        hover: false,
      }
    );
  }

  gsap.to(mapboxPopupElement, {
    display: "none",
    opacity: 0,
    yPercent: 2.5,
    duration: 0.3,
  });

  if (showLocationBar) {
    gsap.to(mapboxLocations, {
      yPercent: 0,
      opacity: 1,
      duration: 0.6,
      delay: 0.4,
      overwrite: true,
    });
  }
  currentStore = "";
}

mapboxPopupElement
  .querySelector(".mapbox_popup-close")
  .addEventListener("click", () => {
    hidePopup();
  });

let storeSwiper = new Swiper(mapboxStoreContainer, {
  wrapperClass: mapboxStoreWrapper.classList[0],
  slideClass: mapboxStoreSlide.classList[0],
  speed: 300,
  grabCursor: true,
  slidesPerView: "auto",
  direction: "horizontal",
  spaceBetween: 4,
  on: {
    init: function (swiper) {
      swiper.wrapperEl.style.gridColumnGap = "unset";
    },
  },
});

function populatePopup(feature) {
  // mapboxPopupElement.style.display = "flex";

  // gsap.set(mapboxPopupElement, {
  //   marginBottom: showLocationBar ? 0 : -mapboxLocations.clientHeight,
  // });

  gsap.to(mapboxPopupElement, {
    display: "flex",
    opacity: 1,
    yPercent: 0,
    duration: 0.3,
    delay: (showLocationBar ? .2 : 0)
  });

  gsap.to(mapboxLocations, {
    yPercent: 100,
    opacity: 0,
    duration: 0.4,
    overwrite: true,
  });

  mapboxPopupElement.querySelector("[data-name=name]").textContent =
    feature.properties.name;
  mapboxPopupElement.querySelector("[data-name=address]").textContent =
    feature.properties.address;
  mapboxPopupElement.querySelector("[data-name=address2]").textContent =
    feature.properties.address2;
  mapboxPopupElement.querySelector("[data-name=zipCity]").textContent =
    feature.properties.zip + " " + feature.properties.city;
  mapboxPopupElement.querySelector("[data-name=country]").textContent =
    feature.properties.country;
  mapboxPopupElement.querySelector("[data-name=phone]").textContent =
    feature.properties.phone;
  mapboxPopupElement
    .querySelector("[data-name=phone]")
    .setAttribute("href", "tel:" + feature.properties.phone);
  mapboxPopupElement.querySelector("[data-name=website]").textContent =
    feature.properties.website;

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(feature.properties.url)) {
    mapboxPopupElement
      .querySelector("[data-name=website]")
      .setAttribute("href", `mailto:${feature.properties.url}`);
  } else if (
    !feature.properties.url.startsWith("https://") &&
    !feature.properties.url.startsWith("http://")
  ) {
    mapboxPopupElement
      .querySelector("[data-name=website]")
      .setAttribute("href", `https://${feature.properties.url}`);
  } else {
    mapboxPopupElement
      .querySelector("[data-name=website]")
      .setAttribute("href", feature.properties.url);
  }

  currentStore = feature.properties.name;
}

function renderListings(features) {
  const empty = document.createElement("p");
  // Clear any existing listings

  storeSwiper.removeAllSlides();
  mapboxStoreWrapper.innerHTML = "";

  isFound = false;

  if (features.length && showLocationBar) {
    let iterations = 0;

    features.sort((a, b) => b.properties.size - a.properties.size);

    for (const feature of features) {
      if (iterations >= 200) {
        // console.log(`break at ${iterations} items`);
        break;
      }
      iterations++;

      if (feature.properties.name === currentStore && !isFound) {
        isFound = true;
      }

      const itemLink = document.createElement("a");
      itemLink.className = "mapbox_store-item"; //mapboxStoreSlide.classList[0];
      itemLink.setAttribute("data-icon-id", feature.id);
      itemLink.textContent = feature.properties.name;

      storeSwiper.appendSlide(itemLink);

      itemLink.addEventListener("mouseover", () => {
        storeSwiper.slides.forEach((slide, i) => {
          if (!slide.matches(":hover")) slide.style.opacity = 0.4;
        });

        highlightIcon(feature);

      });

      itemLink.addEventListener("click", () => {
        populatePopup(feature);
        highlightIcon(feature);
        highlightedHeartIconIndex = feature.id;
        highlightedHeartIcon = true;
      });

      itemLink.addEventListener("mouseleave", () => {
        storeSwiper.slides.forEach((slide, i) => {
          slide.style.opacity = 1;
        });

        if(!highlightedHeartIcon) {
          const icons = map.queryRenderedFeatures({
            layers: ["hidden-locations"],
          });
          for (icon of icons) {
            map.setFeatureState(
              {
                source: "stores",
                id: icon.id,
              },
              {
                hover: false,
              }
            );
          }
        }
      });



    }

    // Show the filter input
  } else if (features.length === 0) {
    empty.textContent = "No results found";
    mapboxStoreWrapper.appendChild(empty);
  } else {
    empty.textContent = "Drag the map to populate results";
    mapboxStoreWrapper.appendChild(empty);
  }

  if (!isFound) hidePopup();
}


function highlightIcon(feature) {
  const icons = map.queryRenderedFeatures({
    layers: ["hidden-locations"],
  });
  for (icon of icons) {
    if (icon.id !== feature.id && !highlightedHeartIcon) {
      map.setFeatureState(
        {
          source: "stores",
          id: icon.id,
        },
        {
          hover: true,
        }
      );
    } else if (icon.id === feature.id) {
      map.setFeatureState(
        {
          source: "stores",
          id: icon.id,
        },
        {
          hover: false,
        }
      );
    }
  }
}
