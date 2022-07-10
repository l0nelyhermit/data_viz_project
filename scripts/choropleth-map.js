class ChoroplethMap {
  constructor({ parentElement, data, worldMap, inputDirection, selectedDate }) {
    this.parentElement = parentElement;
    this.data = data;
    this.worldMap = worldMap;
    this.inputDirection = inputDirection;
    this.selectedDate = selectedDate;
    this.initizalizeMap();
  }

  initizalizeMap() {
    this.land = topojson.feature(this.worldMap, this.worldMap.objects.land);
    this.border = topojson.mesh(
      this.worldMap,
      this.worldMap.objects.countries,
      (a, b) => a !== b
    );
    this.features = topojson.feature(
      this.worldMap,
      this.worldMap.objects.countries
    );

    // Subset of features that only contains 11 countries in dataset
    this.databaseSet = new Set(this.data.map((d) => d.code));
    this.dataFeatures = {
      type: "FeatureCollection",
      features: this.features.features.filter((d) =>
        this.databaseSet.has(d.id)
      ),
    };

    // this.singapore = this.features.features.find((d) => d.id === "702");

    this.color = d3.scaleSequential(d3.interpolateReds);

    this.projection = d3.geoMercator();
    this.path = d3.geoPath(this.projection);

    this.wrapper = d3
      .select(this.parentElement)
      .classed("choropleth-map", true)
      .append("div")
      .attr("class", "chart-wrapper");

    this.svg = this.wrapper.append("svg").attr("class", "chart-svg");

    this.svg
      .append("defs")
      .append("marker")
      .attr("id", "flow-path-marker")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5Z")
      .attr("stroke", "currentColor")
      .attr("fill", "lightblue");

    this.mapGroup = this.svg.append("g");

    this.tooltip = new Tooltip();

    this.legend = this.wrapper
      .append("div")
      .attr("class", "legend-wrapper d-flex justify-content-center");
    this.legend.append("svg");

    this.resizeVisualization();
    this.updateVisualization();
    window.addEventListener("resize", () => {
      this.resizeVisualization();
    });
  }

  resizeVisualization() {
    this.width = this.parentElement.clientWidth;

    // Scale the projection to fit the width, and then compute the corresponding height.
    const [[x0, y0], [x1, y1]] = d3
      .geoPath(this.projection.fitWidth(this.width, this.dataFeatures))
      .bounds(this.dataFeatures);
    const dy = Math.ceil(y1 - y0);
    const l = Math.min(Math.ceil(x1 - x0), dy);
    this.projection
      .scale((this.projection.scale() * (l - 1)) / l)
      .precision(0.2);
    this.height = dy;

    this.svg
      .attr("width", this.width)
      .attr("height", this.height)
      .attr("viewBox", [0, 0, this.width, this.height]);

    if (this.initialized) {
      this.renderVisualization();
    } else {
      this.initialized = true;
    }
  }

  updateVisualization() {
    this.displayData = this.data.filter(
      (d) => d.direction === this.inputDirection && this.selectedDate === d.date
    );

    this.values = d3.map(this.displayData, (d) => d.value);
    this.colorDomain = [0, d3.max(this.values)];
    this.color.domain(this.colorDomain).nice();

    this.legend
      .node()
      .replaceChild(ColorLegend(this.color), this.legend.select("svg").node());

    this.renderVisualization();
  }

  renderVisualization() {
    this.landPath = this.mapGroup
      .selectAll(".land-path")
      .data([this.land])
      .join("path")
      .attr("class", "land-path")
      .attr("d", this.path);

    this.borderPath = this.mapGroup
      .selectAll(".border-path")
      .data([this.border])
      .join("path")
      .attr("class", "border-path")
      .attr("d", this.path);

    this.countryPath = this.mapGroup
      .selectAll(".country-path")
      .data(this.dataFeatures.features)
      .join("path")
      .attr("class", "country-path")
      .attr("fill", (f) => {
        const d = this.displayData.find((e) => e.code === f.id);
        return d.value === null ? "none" : this.color(d.value);
      })
      .attr("d", this.path)
      .on("mouseenter", (event, f) => {
        const d = this.displayData.find((e) => e.code === f.id);
        const parseTime = d3.timeParse("%Y-%m");
        const formatTime = d3.timeFormat("%B %Y");
        const formatValue = d3.format(",");
        const html = `
          <div><strong>${d.name} in ${formatTime(
          parseTime(d.date)
        )}</strong></div>
            <div><strong>${formatValue(d.value)}</strong> passenger ${
          this.inputDirection
        }</div>
        `;
        this.tooltip.show(html);
      })
      .on("mousemove", (event) => {
        this.tooltip.move(event);
      })
      .on("mouseleave", () => {
        this.tooltip.hide();
      });
  }
}

function ColorLegend(
  color,
  {
    title,
    tickSize = 6,
    width = 320,
    height = 44 + tickSize,
    marginTop = 18,
    marginRight = 0,
    marginBottom = 16 + tickSize,
    marginLeft = 0,
    ticks = width / 64,
    tickFormat,
    tickValues,
  } = {}
) {
  function ramp(color, n = 256) {
    const canvas = document.createElement("canvas");
    canvas.width = n;
    canvas.height = 1;
    const context = canvas.getContext("2d");
    for (let i = 0; i < n; ++i) {
      context.fillStyle = color(i / (n - 1));
      context.fillRect(i, 0, 1, 1);
    }
    return canvas;
  }

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .style("overflow", "visible")
    .style("display", "block");

  let tickAdjust = (g) =>
    g.selectAll(".tick line").attr("y1", marginTop + marginBottom - height);
  let x;

  // Continuous
  if (color.interpolate) {
    const n = Math.min(color.domain().length, color.range().length);

    x = color
      .copy()
      .rangeRound(
        d3.quantize(d3.interpolate(marginLeft, width - marginRight), n)
      );

    svg
      .append("image")
      .attr("x", marginLeft)
      .attr("y", marginTop)
      .attr("width", width - marginLeft - marginRight)
      .attr("height", height - marginTop - marginBottom)
      .attr("preserveAspectRatio", "none")
      .attr(
        "xlink:href",
        ramp(
          color.copy().domain(d3.quantize(d3.interpolate(0, 1), n))
        ).toDataURL()
      );
  }

  // Sequential
  else if (color.interpolator) {
    x = Object.assign(
      color
        .copy()
        .interpolator(d3.interpolateRound(marginLeft, width - marginRight)),
      {
        range() {
          return [marginLeft, width - marginRight];
        },
      }
    );

    svg
      .append("image")
      .attr("x", marginLeft)
      .attr("y", marginTop)
      .attr("width", width - marginLeft - marginRight)
      .attr("height", height - marginTop - marginBottom)
      .attr("preserveAspectRatio", "none")
      .attr("xlink:href", ramp(color.interpolator()).toDataURL());

    // scaleSequentialQuantile doesn’t implement ticks or tickFormat.
    if (!x.ticks) {
      if (tickValues === undefined) {
        const n = Math.round(ticks + 1);
        tickValues = d3
          .range(n)
          .map((i) => d3.quantile(color.domain(), i / (n - 1)));
      }
      if (typeof tickFormat !== "function") {
        tickFormat = d3.format(tickFormat === undefined ? ",f" : tickFormat);
      }
    }
  }

  // Threshold
  else if (color.invertExtent) {
    const thresholds = color.thresholds
      ? color.thresholds() // scaleQuantize
      : color.quantiles
      ? color.quantiles() // scaleQuantile
      : color.domain(); // scaleThreshold

    const thresholdFormat =
      tickFormat === undefined
        ? (d) => d
        : typeof tickFormat === "string"
        ? d3.format(tickFormat)
        : tickFormat;

    x = d3
      .scaleLinear()
      .domain([-1, color.range().length - 1])
      .rangeRound([marginLeft, width - marginRight]);

    svg
      .append("g")
      .selectAll("rect")
      .data(color.range())
      .join("rect")
      .attr("x", (d, i) => x(i - 1))
      .attr("y", marginTop)
      .attr("width", (d, i) => x(i) - x(i - 1))
      .attr("height", height - marginTop - marginBottom)
      .attr("fill", (d) => d);

    tickValues = d3.range(thresholds.length);
    tickFormat = (i) => thresholdFormat(thresholds[i], i);
  }

  // Ordinal
  else {
    x = d3
      .scaleBand()
      .domain(color.domain())
      .rangeRound([marginLeft, width - marginRight]);

    svg
      .append("g")
      .selectAll("rect")
      .data(color.domain())
      .join("rect")
      .attr("x", x)
      .attr("y", marginTop)
      .attr("width", Math.max(0, x.bandwidth() - 1))
      .attr("height", height - marginTop - marginBottom)
      .attr("fill", color);

    tickAdjust = () => {};
  }

  svg
    .append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(ticks, typeof tickFormat === "string" ? tickFormat : undefined)
        .tickFormat(typeof tickFormat === "function" ? tickFormat : undefined)
        .tickSize(tickSize)
        .tickValues(tickValues)
    )
    .call(tickAdjust)
    .call((g) => g.select(".domain").remove())
    .call((g) =>
      g
        .append("text")
        .attr("x", marginLeft)
        .attr("y", marginTop + marginBottom - height - 6)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .attr("class", "title")
        .text(title)
    );

  return svg.node();
}
