class SlopeChart {
  constructor({
    parentElement,
    data,
    inputDirection,
    selectedLeftDate,
    selectedRightDate,
  }) {
    this.parentElement = parentElement;
    this.data = data;
    this.inputDirection = inputDirection;
    this.selectedLeftDate = selectedLeftDate;
    this.selectedRightDate = selectedRightDate;
    this.initializeSlopeChart();
  }

  initializeSlopeChart() {
    this.marginTop = 20;
    this.marginRight = 150;
    this.marginBottom = 20;
    this.marginLeft = 150;
    this.insetTop = 30;
    this.insetBottom = 30;
    this.labelPadding = 3;
    this.labelSeparation = 15;
    this.height = 500;

    this.yRange = [
      this.height - this.marginBottom - this.insetBottom,
      this.marginTop + this.insetTop,
    ];

    // Construct the scales, axes and formats.
    this.xScale = d3.scalePoint();
    this.yScale = d3.scaleLinear().range(this.yRange);
    this.zScale = d3
      .scaleOrdinal()
      .range([
        "#7F3C8D",
        "#11A579",
        "#3969AC",
        "#F2B701",
        "#E73F74",
        "#80BA5A",
        "#E68310",
        "#008695",
        "#CF1C90",
        "#f97b72",
        "#4b4b8f",
      ]);

    this.xFormat = (d) => {
      const [year, month] = d.split("-");
      return `${month}/${year}`;
    };
    this.yFormat = d3.format(",");

    this.xAxis = d3
      .axisTop(this.xScale)
      .tickSizeOuter(0)
      .tickFormat(this.xFormat);

    // Line generator
    this.line = d3
      .line()
      .defined((i) => this.D[i])
      .x((i) => this.xScale(this.X[i]))
      .y((i) => this.yScale(this.Y[i]));

    this.wrapper = d3
      .select(this.parentElement)
      .classed("slope-chart", true)
      .append("div")
      .attr("class", "chart-wrapper");

    this.svg = this.wrapper.append("svg").attr("class", "chart-svg");

    this.xAxisGroup = this.svg
      .append("g")
      .attr("transform", `translate(0,${this.marginTop})`);

    this.slopesGroup = this.svg
      .append("g")
      .attr("fill", "none")
      .attr("class", "slopes-g");

    this.labelsGroup = this.svg.append("g").attr("class", "labels-g");

    this.tooltip = new Tooltip();

    this.resizeVisualization();
    this.updateVisualization();
    window.addEventListener("resize", () => {
      this.resizeVisualization();
    });
  }

  resizeVisualization() {
    this.width = this.parentElement.clientWidth;

    this.xRange = [this.marginLeft, this.width - this.marginRight];

    this.xScale.range(this.xRange);

    this.svg
      .attr("width", this.width)
      .attr("height", this.height)
      .attr("viewBox", [0, 0, this.width, this.height]);

    if (this.slopeChartInitialized) {
      this.renderVisualization();
    } else {
      this.slopeChartInitialized = true;
    }
  }

  updateVisualization() {
    this.displayData = this.data.filter(
      (d) =>
        d.direction === this.inputDirection &&
        [this.selectedLeftDate, this.selectedRightDate].includes(d.date)
    );

    this.X = this.displayData.map((d) => d.date);
    this.Y = this.displayData.map((d) => d.value);
    this.Z = this.displayData.map((d) => d.name);
    this.D = this.displayData.map((d) => d.value !== null);
    this.I = d3.range(this.X.length);
    this.Ix = d3.group(this.I, (i) => this.X[i]);

    this.xDomain = new Set(this.X);
    this.yDomain = d3.extent(this.Y);
    this.zDomain = new Set(this.Z);

    this.xScale.domain(this.xDomain);
    this.yScale.domain(this.yDomain).nice();
    this.zScale.domain(this.zDomain);

    this.renderVisualization();
  }

  renderVisualization() {
    this.xAxisGroup.call(this.xAxis).call((g) => g.select(".domain").remove());

    this.slopePath = this.slopesGroup
      .selectAll(".slope-path")
      .data(d3.group(this.I, (i) => this.Z[i]))
      .join("path")
      .attr("class", "slope-path")
      .attr("stroke", ([z]) => this.zScale(z))
      .attr("d", ([, I]) => this.line(I));

    this.labelsColumnGroup = this.labelsGroup
      .selectAll(".labels-column-g")
      .data([...this.xDomain].entries())
      .join("g")
      .attr("class", "labels-column-g")
      .attr("text-anchor", ([i]) => (i === 0 ? "end" : "start"));

    this.labelTexts = [];

    for (const [i, x] of [...this.xDomain].entries()) {
      this.labelTexts[i] = this.labelsColumnGroup
        .filter(([ix]) => ix === i)
        .selectAll(".label-text")
        .data(this.Ix.get(x).filter((i) => this.D[i]))
        .join("text")
        .attr("class", "label-text")
        .attr("x", this.xScale(x))
        .call(
          dodgeAttr,
          "y",
          (j) => this.yScale(this.Y[j]),
          this.labelSeparation
        )
        .attr("dy", "0.35em")
        .attr("dx", (i === 0 ? -1 : 1) * this.labelPadding)
        .attr("fill", (j) => this.zScale(this.Z[j]))
        .text(
          i === 0
            ? (j) => `${this.Z[j]} ${this.yFormat(this.Y[j])}`
            : (j) => `${this.yFormat(this.Y[j])} ${this.Z[j]}`
        )
        .on("mouseenter", (event, j) => {
          const name = this.Z[j];

          const parseTime = d3.timeParse("%Y-%m");
          const formatTime = d3.timeFormat("%B %Y");
          const leftDate = formatTime(parseTime(this.selectedLeftDate));
          const rightDate = formatTime(parseTime(this.selectedRightDate));

          const formatValue = d3.format(",");
          const ks = d3.group(this.I, (i) => this.Z[i]).get(this.Z[j]);
          const [leftValue, rightValue] = ks.map((k) => this.Y[k]);

          const formatChange = (d) => {
            if (d === 0) return "<div><strong>no change</strong></div>";
            if (d > 0)
              return `<div><strong>increased by ${d3.format(",.0%")(
                d
              )}</strong></div>`;
            else
              return `<div><strong>decreased by ${d3.format(",.0%")(
                -d
              )}</strong></div>`;
          };
          let change;
          if (leftValue !== null && rightValue !== null) {
            change = (rightValue - leftValue) / leftValue;
          }

          let html = `<div><strong>${name}</strong></div>`;
          if (rightValue !== null) {
            html += `<div>${formatValue(rightValue)} passenger ${
              this.inputDirection
            } in <strong>${rightDate}</strong></div>`;
          }
          if (change !== undefined) {
            html += "<div>compared to</div>";
          }
          if (leftValue !== null) {
            html += `<div>${formatValue(leftValue)} passenger ${
              this.inputDirection
            } in <strong>${leftDate}</strong></div>`;
          }
          if (change !== undefined) {
            html += formatChange(change);
          }

          this.tooltip.show(html);

          this.slopePath.classed("muted", ([z]) => z !== name);
          this.labelTexts.forEach((labelText) => {
            labelText.classed("muted", (j) => !ks.includes(j));
          });
        })
        .on("mousemove", (event) => {
          this.tooltip.move(event);
        })
        .on("mouseleave", () => {
          this.tooltip.hide();

          this.slopePath.classed("muted", false);
          this.labelTexts.forEach((labelText) => {
            labelText.classed("muted", false);
          });
        });
    }

    function dodgeAttr(selection, name, value, separation) {
      const V = dodge(selection.data().map(value), separation);
      selection.attr(name, (_, i) => V[i]);
    }

    function dodge(V, separation, maxiter = 10, maxerror = 1e-1) {
      const n = V.length;
      if (!V.every(isFinite)) throw new Error("invalid position");
      if (!(n > 1)) return V;
      let I = d3.range(V.length);
      for (let iter = 0; iter < maxiter; ++iter) {
        I.sort((i, j) => d3.ascending(V[i], V[j]));
        let error = 0;
        for (let i = 1; i < n; ++i) {
          let delta = V[I[i]] - V[I[i - 1]];
          if (delta < separation) {
            delta = (separation - delta) / 2;
            error = Math.max(error, delta);
            V[I[i - 1]] -= delta;
            V[I[i]] += delta;
          }
        }
        if (error < maxerror) break;
      }
      return V;
    }
  }
}
