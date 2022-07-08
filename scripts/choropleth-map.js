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

    this.singapore = this.features.features.find((d) => d.id === "702");

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
    this.flowGroup = this.svg.append("g");

    this.tooltip = new Tooltip();

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

    this.flows = this.displayData
      .filter((d) => d.value !== null)
      .map((d) => {
        const feature = this.dataFeatures.features.find((e) => e.id === d.code);
        const makeOutward = this.inputDirection === "departures";
        const source = makeOutward ? this.singapore : feature;
        const target = makeOutward ? feature : this.singapore;
        return { source, target };
      });

    this.values = d3.map(this.displayData, (d) => d.value);
    this.colorDomain = [0, d3.max(this.values)];
    this.color.domain(this.colorDomain).nice();

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

    this.flowGroup
      .selectAll(".flow-path")
      .data(this.flows)
      .join("path")
      .attr("class", "flow-path")
      .attr("marker-end", "url(#flow-path-marker)")
      .attr("d", (d) => {
        const [sourceX, sourceY] = this.path.centroid(d.source);
        const [targetX, targetY] = this.path.centroid(d.target);
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const dr = Math.sqrt(dx * dx + dy * dy);
        return `M${sourceX},${sourceY}A${dr},${dr} 0 0,1 ${targetX},${targetY}`;
      });
  }
}
