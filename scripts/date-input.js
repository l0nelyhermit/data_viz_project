class DateInput {
  constructor({ parentElement, initialValue, yearOnly = false }) {
    this.parentElement = parentElement;
    this.initialValue = initialValue;
    this.yearOnly = yearOnly;
    this.initVisualization();
  }

  initVisualization() {
    this.wrapper = d3
      .select(this.parentElement)
      .append("div")
      .attr("class", "hstack gap-2");

    [this.initialYear, this.initialMonth] = this.initialValue.split("-");

    if (!this.yearOnly) {
      this.months = [
        { value: "01", text: "January" },
        { value: "02", text: "February" },
        { value: "03", text: "March" },
        { value: "04", text: "April" },
        { value: "05", text: "May" },
        { value: "06", text: "June" },
        { value: "07", text: "July" },
        { value: "08", text: "August" },
        { value: "09", text: "September" },
        { value: "10", text: "October" },
        { value: "11", text: "November" },
        { value: "12", text: "December" },
      ];

      this.monthInput = this.wrapper.append("div");
      this.monthInput.append("label").text("Month");
      this.monthSelect = this.monthInput
        .append("select")
        .attr("class", "form-select form-select-sm")
        .on("input", () => {
          this.onDateChange();
        });
      this.monthSelect
        .selectAll("option")
        .data(this.months)
        .join("option")
        .attr("value", (d) => d.value)
        .attr("selected", (d) => (d.value === this.initialMonth ? "" : null))
        .text((d) => d.text);
    }

    const minYear = 1961;
    const maxYear = 2019;
    this.years = d3.range(minYear, maxYear + 1).map((year) => ({
      value: String(year),
      text: String(year),
    }));

    this.yearInput = this.wrapper.append("div");
    this.yearInput.append("label").text("Year");
    this.yearSelect = this.yearInput
      .append("select")
      .attr("class", "form-select form-select-sm")
      .on("input", () => {
        this.onDateChange();
      });
    this.yearSelect
      .selectAll("option")
      .data(this.years)
      .join("option")
      .attr("value", (d) => d.value)
      .attr("selected", (d) => (d.value === this.initialYear ? "" : null))
      .text((d) => d.text);
  }

  onDateChange() {
    let date = this.yearSelect.property("value");
    if (!this.yearOnly) {
      date += "-" + this.monthSelect.property("value");
    }
    this.parentElement.dispatchEvent(
      new CustomEvent("datechange", {
        detail: date,
      })
    );
  }
}
