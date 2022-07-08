function renderMap(worldMap, data) {
  //initial values
  let inputDirection = document.querySelector(
    "[name='direction']:checked"
  ).value;
  let selectedDate = "2019-08";

  //Direction Input
  Array.from(document.querySelectorAll("[name='direction']")).forEach(
    (input) => {
      input.addEventListener("input", (event) => {
        inputDirection = event.target.value;
        updateVisualization();
      });
    }
  );

  // Date Input
  const dateInputElement = document.getElementById("choroplethDateInput");
  dateInputElement.addEventListener("datechange", (event) => {
    selectedDate = event.detail;
    updateVisualization();
  });
  new DateInput({
    parentElement: dateInputElement,
    initialValue: selectedDate,
  });

  //Choropleth
  const choroplethChart = new ChoroplethMap({
    parentElement: document.getElementById("choroplethChartArea"),
    data,
    worldMap,
    inputDirection,
    selectedDate,
  });

  function updateVisualization() {
    choroplethChart.inputDirection = inputDirection;
    choroplethChart.selectedDate = selectedDate;
    choroplethChart.updateVisualization();
  }
}
