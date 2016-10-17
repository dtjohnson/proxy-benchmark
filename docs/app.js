angular.module('app', ['nvd3'])
    .controller('AppCtrl', function ($scope, $http, $location) {
        $scope.model = {};
        var results;

        $scope.options = {
            chart: {
                type: 'lineChart',
                height: 500,
                margin: { top: 20, right: 20, bottom: 40, left: 100 },
                useInteractiveGuideline: true,
                x: function(d) { return d.x >0 ? Math.log10(d.x + 1) : 0 },
                xAxis: {
                    tickFormat: function (d) { return (Math.pow(10, d) - 1).toFixed(0) },
                    axisLabel: 'Message Length (chars)'
                },
                yAxis: {
                    axisLabel: 'Throughput (B)',
                    axisLabelDistance: 20
                }
            }
        };

        var drawChart = function () {
            var yMax = 0;
            $scope.data = [];
            _(results)
                .filter({
                    connections: $scope.model.connections
                })
                .groupBy("image")
                .forOwn(function (datapoints, image) {
                    datapoints = _.map(datapoints, function (datapoint) {
                        return {
                            x: datapoint.messageLength,
                            y: datapoint[$scope.model.field]
                        };
                    });

                    var y = _.maxBy(datapoints, "y").y;
                    if (y > yMax) yMax = y;

                    $scope.data.push({
                        key: image,
                        values: datapoints
                    });
                });

            // Set the min/max Y value.
            $scope.options.chart.yAxis.axisLabel = _.find($scope.fieldOptions, ['field', $scope.model.field]).label;
            $scope.options.chart.yDomain = [0, yMax];
        };

        var fetchData = function () {
            results = [];
            $http.get($scope.model.url)
                .then(function (res) {
                    $scope.model.urlError = false;
                    results = res.data;
                    $scope.connectionOptions = _(results).map('connections').uniq().sortBy().value();
                    $scope.model.connections = $scope.connectionOptions[0];
                    drawChart();
                })
                .catch(function () {
                    $scope.model.urlError = true;
                });
        };

        $scope.fieldOptions = [
            { label: "Throughput (B)", field: "transferBytesPerSec" },
            { label: "Requests/s", field: "requestsPerSec" },
            { label: "Latency (ms)", field: "latencyMs" }
        ];
        $scope.model.field = $scope.fieldOptions[0].field;
        $scope.model.url = "https://raw.githubusercontent.com/dtjohnson/proxy-benchmark/master/results.json";

        $scope.$watch("model.url", function () {
            $location.search("url", $scope.model.url);
            fetchData();
        });

        $scope.$watchGroup(["model.connections", "model.field"], function () {
            $location.search("connections", $scope.model.connections);
            $location.search("field", $scope.model.field);
            if (results.length) drawChart();
        });

        $scope.$watch(function () {
            return $location.search();
        }, function (search) {
            $scope.model.url = search.url;
            $scope.model.connections = parseInt(search.connections) || $scope.connectionOptions && $scope.connectionOptions[0];
            $scope.model.field = search.field || $scope.fieldOptions[0].field;
        });
    });
