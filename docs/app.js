angular.module('app', ['nvd3'])
    .controller('AppCtrl', function ($scope, $http, $location) {
        $scope.model = {
            compression: false,
            keepAlive: true,
            ssl: false
        };

        var results;

        $scope.options = {
            chart: {
                type: 'lineChart',
                height: 500,
                margin: { top: 20, right: 20, bottom: 40, left: 100 },
                useInteractiveGuideline: true,
                xAxis: {
                    axisLabel: 'Request Rate (req/s)'
                },
                yAxis: {
                    axisLabelDistance: 20
                }
            }
        };

        var drawChart = function () {
            var xMax = 0, xMin = Infinity;
            var yMax = 0, yMin = Infinity;
            $scope.data = [];
            _(results)
                .filter({
                    connections: $scope.model.connections,
                    messageLength: $scope.model.messageLength,
                    delay: $scope.model.delay,
                    compression: $scope.model.compression,
                    keepAlive: $scope.model.keepAlive,
                    ssl: $scope.model.ssl
                })
                .groupBy("image")
                .forOwn(function (datapoints, image) {
                    datapoints = _.map(datapoints, function (datapoint) {
                        return {
                            x: datapoint.requestRate,
                            y: datapoint[$scope.model.field]
                        };
                    });

                    var y = _.maxBy(datapoints, "y").y;
                    if (y > yMax) yMax = y;

                    var ym = _.minBy(datapoints, "y").y;
                    if (ym < yMin) yMin = ym;

                    var x = _.maxBy(datapoints, "x").x;
                    if (x > xMax) xMax = x;

                    var xm = _.minBy(datapoints, "x").x;
                    if (xm < xMin) xMin = xm;

                    $scope.data.push({
                        key: image,
                        values: datapoints
                    });
                });

            $scope.options.chart.yDomain = [0, yMax];

            $scope.options.chart.yAxis.axisLabel = _.find($scope.fieldOptions, ['field', $scope.model.field]).label;
        };

        var fetchData = function () {
            results = [];
            $http.get($scope.model.url)
                .then(function (res) {
                    $scope.model.urlError = false;
                    results = res.data;
                    $scope.connectionOptions = _(results).map('connections').uniq().sortBy().value();
                    $scope.messageLengthOptions = _(results).map('messageLength').uniq().sortBy().value();
                    $scope.delayOptions = _(results).map('delay').uniq().sortBy().value();
                    $scope.model.connections = $scope.model.connections || $scope.connectionOptions[0];
                    $scope.model.messageLength = $scope.model.messageLength || $scope.messageLengthOptions[0];
                    $scope.model.delay = $scope.model.delay || $scope.delayOptions[0];
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

        $scope.$watchGroup(["model.compression", "model.keepAlive", "model.ssl", "model.connections", "model.messageLength", "model.delay", "model.field"], function () {
            $location.search("compression", $scope.model.compression ? "true" : "false");
            $location.search("keepAlive", $scope.model.keepAlive ? "true" : "false");
            $location.search("ssl", $scope.model.ssl ? "true" : "false");
            $location.search("connections", $scope.model.connections);
            $location.search("messageLength", $scope.model.messageLength);
            $location.search("delay", $scope.model.delay);
            $location.search("field", $scope.model.field);
            if (results.length) drawChart();
        });

        $scope.$watch(function () {
            return $location.search();
        }, function (search) {
            $scope.model.compression = search.compression === "true";
            $scope.model.keepAlive = search.keepAlive === "true";
            $scope.model.ssl = search.ssl === "true";
            $scope.model.url = search.url;
            $scope.model.connections = parseInt(search.connections) || $scope.connectionOptions && $scope.connectionOptions[0];
            $scope.model.messageLength = parseInt(search.messageLength) || $scope.messageLengthOptions && $scope.messageLengthOptions[0];
            $scope.model.delay = parseInt(search.delay) || $scope.delayOptions && $scope.delayOptions[0];
            $scope.model.field = search.field || $scope.fieldOptions[0].field;
        });
    });
