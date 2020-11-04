sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.ugl.ygpstest.YGpsTest.controller.View1", {
        onInit: function () {

        },

        onPress: function (oEvent) {
            // Call function
            // Boolean true defines wether to use GPS for higher accuracy when available and network position as fallback.
            // Set to false to get position only based on network location.
            var youAreHere = this.getLocation(true);
            // this.byId("accuracy").setValue(youAreHere.ACCURACY);
            // this.byId("latitude").setValue(youAreHere.LATITUDE);
            // this.byId("longitude").setValue(youAreHere.LONGITUDE);
        },

        // Declare function
        getLocation: function getLocation(enableHighAccuracy) {
            if (navigator.geolocation) {
                var obj = {};
                navigator.geolocation.getCurrentPosition(function (position) {

                    // Accuracy in meters, latitude and longitude
                    obj.ACCURACY = position.coords.accuracy;
                    obj.LATITUDE = position.coords.latitude;
                    obj.LONGITUDE = position.coords.longitude;
                    this.getView().byId("accuracy").setValue(obj.ACCURACY);
                    this.getView().byId("latitude").setValue(obj.LATITUDE);
                    this.getView().byId("longitude").setValue(obj.LONGITUDE);

                    // Get address from geolocation
                    try {
                        $.ajax({
                            url: 'https://maps.googleapis.com/maps/api/geocode/json',
                            data: {
                                latlng: position.coords.latitude + ',' + position.coords.longitude,
                                sensor: true
                            },
                            success: function (data) {
                                if (data.status == 'OK') {
                                    var strt = $.grep(data.results, function (e) {
                                        return e.types == 'street_address';
                                    });
                                    if (strt.length === 1) {
                                        var route = $.grep(strt[0].address_components, function (e) {
                                            return e.types == 'route';
                                        });
                                        if (route.length === 1) {
                                            obj.STREET = route[0].long_name;
                                        }
                                        var no = $.grep(strt[0].address_components, function (e) {
                                            return e.types == 'street_number';
                                        });
                                        if (no.length === 1) {
                                            obj.STREET_NUMBER = no[0].long_name;
                                        }
                                        var zipcode = $.grep(strt[0].address_components, function (e) {
                                            return e.types == 'postal_code';
                                        });
                                        if (zipcode.length === 1) {
                                            obj.POSTAL_CODE = zipcode[0].long_name;
                                        }
                                        var town = $.grep(strt[0].address_components, function (e) {
                                            return e.types == 'postal_town';
                                        });
                                        if (town.length === 1) {
                                            obj.CITY = town[0].long_name;
                                        }
                                    }
                                }
                            }
                        }).then(
                            function () {
                                console.log("I know where you are!");
                            });
                    } catch (error) {
                        console.warn(error);
                    }

                }.bind(this), function (error) {
                    console.warn(error.code + ' ' + error.message);
                }, {
                    enableHighAccuracy: enableHighAccuracy
                });
                return obj;
            }
        }
    });
});