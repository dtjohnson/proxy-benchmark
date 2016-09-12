angular.module('app', ['nvd3'])
    .controller('AppCtrl', function ($scope, $http, $location) {
        var results;

        $scope.options = {
            chart: {
                type: 'lineChart',
                height: 450,
                margin: { top: 20, right: 20, bottom: 40, left: 55 },
                useInteractiveGuideline: true,
                xAxis: {
                    axisLabel: 'Message Length (chars)'
                },
                yAxis: {
                    axisLabel: 'Throughput (B)',
                    axisLabelDistance: -10
                }
            }
        };

        var drawChart = function () {
            var yMax = 0;
            $scope.data = [];
            _(results)
                .filter({
                    connections: $scope.connections
                })
                .groupBy("image")
                .forOwn(function (datapoints, image) {
                    datapoints = _.map(datapoints, function (datapoint) {
                        return {
                            x: datapoint.messageLength,
                            y: datapoint.transferBytesPerSec
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
            $scope.options.chart.yDomain = [0, Math.pow(10, Math.ceil(Math.log10(yMax)))];
        };

        var fetchData = function () {
            results = [];
            $http.get($scope.url)
                .then(function (res) {
                    $scope.urlError = false;
                    results = res.data;
                    $scope.connectionOptions = _(results).map('connections').uniq().sortBy().value();
                    $scope.connections = $scope.connectionOptions[0];
                    drawChart();
                })
                .catch(function () {
                    $scope.urlError = true;
                });
        };

        $scope.url = "https://raw.githubusercontent.com/dtjohnson/proxy-benchmark/master/results.json";

        $scope.$watch("url", function () {
            $location.search("url", $scope.url);
            fetchData();
        });

        $scope.$watch("connections", function () {
            $location.search("connections", $scope.connections);
            drawChart();
        });

        $scope.$watch(function () {
            return $location.search().url;
        }, function (url) {
            $scope.url = url;
        });

        $scope.$watch(function () {
            return $location.search().connections;
        }, function (connections) {
            $scope.connections = parseInt(connections) || ($scope.connectionOptions && $scope.connectionOptions[0]);
        });
    });
