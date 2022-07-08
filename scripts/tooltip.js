class Tooltip {
  constructor() {
    this.tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "visualization-tooltip card shadow fade");
  }
  show(html) {
    this.tooltip.html(html).classed("show", true);
  }
  move(event) {
    this.tooltip
      .style("left", `${event.pageX + 20}px`)
      .style("top", `${event.pageY - 50}px`);
  }
  hide() {
    this.tooltip.classed("show", false);
  }
}
