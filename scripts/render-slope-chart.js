function renderSlopeChart(data) {
  // loading initial values
  let inputDirection = document.querySelector(
    "[name='direction']:checked"
  ).value;
  let selectedLeftDate = "2009-08";
  let selectedRightDate = "2019-08";

  // Direction Input
  Array.from(document.querySelectorAll("[name='direction']")).forEach(
    (input) => {
      input.addEventListener("input", (event) => {
        inputDirection = event.target.value;
        updateVisualization();
      });
    }
  );

  // Date Inputs
  const leftDateInputElement = document.getElementById(
    "slopeChartLeftDateInput"
  );
  leftDateInputElement.addEventListener("datechange", (event) => {
    selectedLeftDate = event.detail;
    updateVisualization();
  });
  new DateInput({
    parentElement: leftDateInputElement,
    initialValue: selectedLeftDate,
  });

  const rightDateInputElement = document.getElementById(
    "slopeChartRightDateInput"
  );
  rightDateInputElement.addEventListener("datechange", (event) => {
    selectedRightDate = event.detail;
    updateVisualization();
  });
  new DateInput({
    parentElement: rightDateInputElement,
    initialValue: selectedRightDate,
  });

  // Slope Chart
  const slopeChart = new SlopeChart({
    parentElement: document.getElementById("slopeChartArea"),
    data,
    inputDirection,
    selectedLeftDate,
    selectedRightDate,
  });

  function updateVisualization() {
    slopeChart.inputDirection = inputDirection;
    slopeChart.selectedLeftDate = selectedLeftDate;
    slopeChart.selectedRightDate = selectedRightDate;
    slopeChart.updateVisualization();
  }
}
