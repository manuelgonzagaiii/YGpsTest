sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "com/ugl/ygpstest/YGpsTest/thirdparty/exifreader"
], function (Controller, Exif, barcode) {
    "use strict";

    return Controller.extend("com.ugl.ygpstest.YGpsTest.controller.View1", {
        onInit: function () {

        },

        onChange: function (oEvent) {
            var aFile = jQuery.grep(oEvent.getParameter("files"), function (o) {
                return o.name === oEvent.getParameter("newValue");
            });

            if (!aFile.length) {
                return;
            }
            this.uploadPhoto(aFile[0]);
            this.getView().byId("addPhoto").setValue(null);
        },

        onPress: function (oEvent) {
            // Call function
            // Boolean true defines whether to use GPS for higher accuracy when available and network position as fallback.
            // Set to false to get position only based on network location.
            this.populateLocationManually(true);
            // this.byId("accuracy").setValue(youAreHere.ACCURACY);
            // this.byId("latitude").setValue(youAreHere.LATITUDE);
            // this.byId("longitude").setValue(youAreHere.LONGITUDE);
        },

        uploadPhoto: function (oFile) {
            var oFileReader = new FileReader();
            oFileReader.onload = function (event) {
                var vDescription;
                var sPhotoMedata;
                try {
                    var oJSONModel = this.getView().getModel();
                    var oData = oJSONModel.getData();
                    oData.PhotoMetadata = [];

                    var oImageView = this.getView().byId("imageView");
                    var oModelImg = oImageView.getModel("img");
                    var oDataImg = oModelImg.getData();
                    var aBufferView = new Uint8Array(event.target.result);
                    var oBlob = new Blob([aBufferView], {type: oFile.type});
                    var oUrlCreator = window.URL || window.webkitURL;
                    oDataImg.photoUrl = oUrlCreator.createObjectURL(oBlob);
                    oModelImg.refresh(true);

                    var oMetaTable = this.getView().byId("metaTable");
                    oMetaTable.getModel().refresh(true);

                    var vGPSLatitudeRef = "";
                    var vGPSLatitude = "";
                    var vGPSLongitudeRef = "";
                    var vGPSLongitude = "";
                    var tags = ExifReader.load(event.target.result);

                    // The MakerNote tag can be really large. Remove it to lower
                    // memory usage if you're parsing a lot of files and saving the
                    // tags.
                    delete tags['MakerNote'];
                    for (name in tags) {
                        vDescription = this.getDescription(tags[name]);
                        if (vDescription !== undefined) {
                            sPhotoMedata = {
                                "TagName": name,
                                "TagValue": vDescription
                            }
                            switch (name) {
                                case "GPSLatitudeRef":
                                    vGPSLatitudeRef = vDescription;
                                    break;
                                case "GPSLatitude":
                                    vGPSLatitude = vDescription;
                                    break;
                                case "GPSLongitudeRef":
                                    vGPSLongitudeRef = vDescription;
                                case "GPSLongitude":
                                    vGPSLongitude = vDescription;
                                    break;
                            }

                            oData.PhotoMetadata.push(sPhotoMedata);
                        }
                    }

                    if (vGPSLatitude !== "" && vGPSLongitude !== "") {
                        if (vGPSLatitudeRef.indexOf("South") > -1) {
                            vGPSLatitude *= -1;
                        }
                        if (vGPSLongitudeRef.indexOf("West") > -1) {
                            vGPSLongitude *= -1;
                        }
                        this.setAddress(vGPSLatitude, vGPSLongitude);
                    } else {
                        this.populateLocationManually(true);
                    }

                    // oMetaTable.bindRows("/PhotoMetadata");
                    oMetaTable.getModel().refresh(true);

                } catch (error) {
                    alert(error);
                }
            }.bind(this);
            oFileReader.readAsArrayBuffer(oFile);
        },

        // Declare function
        populateLocationManually: function (enableHighAccuracy) {
            if (navigator.geolocation) {
                var obj = {};
                navigator.geolocation.getCurrentPosition(function (position) {
                    // Accuracy in meters, latitude and longitude
                    this.setAddress(position.coords.latitude, position.coords.longitude)
                }.bind(this), function (error) {
                    console.warn(error.code + ' ' + error.message);
                }, {
                    enableHighAccuracy: enableHighAccuracy
                });
                return obj;
            }
        },

        setAddress: function (latitude, longitude) {
            // Get address from geolocation
            // sample https://maps.googleapis.com/maps/api/geocode/json?latlng=-33.84110555555556,151.20802777777777&sensor=false&key=AIzaSyDqKdNjEY89c0jzJsAg1tox56bSN9iTcO8
            var vUrl = "https://maps.googleapis.com/maps/api/geocode/json?";
            var oModel = this.getView().getModel("img");
            var oDataImg = oModel.getData();
            oDataImg.photoStreetNumber = "";
            oDataImg.photoStreet = "";
            oDataImg.photoSuburb = "";
            oDataImg.photoState = "";
            oDataImg.photoPostalCode = "";
            oDataImg.photoCountry = "";
            oModel.refresh(true);
            try {
                $.ajax({
                    url: vUrl,
                    data: {
                        latlng: latitude + ',' + longitude,
                        sensor: true,
                        key: "AIzaSyDqKdNjEY89c0jzJsAg1tox56bSN9iTcO8"
                    },
                    success: function (data) {
                        if (data.status == 'OK') {
                            var aAddress = $.grep(data.results, function (e) {
                                return e.types[0] == "street_address";
                            });
                            if (aAddress.length <= 0){
                                aAddress = $.grep(data.results, function (e) {
                                    return e.types[0] == "premise";
                                });
                            }
                            if (aAddress.length <= 0){
                                aAddress = $.grep(data.results, function (e) {
                                    return e.types[0] == 'establishment';
                                });
                            }
                            if (aAddress.length >= 0) {
                                var aStreetNumber = $.grep(aAddress[0].address_components, function (e) {
                                    return e.types[0] == "street_number";
                                });
                                if (aStreetNumber.length === 1) {
                                    oDataImg.photoStreetNumber = aStreetNumber[0].long_name;
                                }
                                var aStreet = $.grep(aAddress[0].address_components, function (e) {
                                    return e.types[0] == "route";
                                });
                                if (aStreet.length === 1) {
                                    oDataImg.photoStreet = aStreet[0].long_name;
                                }
                                var aSuburb = $.grep(aAddress[0].address_components, function (e) {
                                    return e.types[0] == "locality";
                                });
                                if (aSuburb.length === 1) {
                                    oDataImg.photoSuburb = aSuburb[0].long_name;
                                }
                                var aState = $.grep(aAddress[0].address_components, function (e) {
                                    return e.types[0] == "administrative_area_level_1";
                                });
                                if (aState.length === 1) {
                                    oDataImg.photoState = aState[0].long_name;
                                }
                                var aPostalCode = $.grep(aAddress[0].address_components, function (e) {
                                    return e.types[0] == "postal_code";
                                });
                                if (aPostalCode.length === 1) {
                                    oDataImg.photoPostalCode = aPostalCode[0].long_name;
                                }
                                var aCountry = $.grep(aAddress[0].address_components, function (e) {
                                    return e.types[0] == "country";
                                });
                                if (aCountry.length === 1) {
                                    oDataImg.photoCountry = aCountry[0].long_name;
                                }
                            }
                            oModel.refresh(true);
                        }
                    }
                }).then(
                    function () {
                        console.log("I know where you are!");
                    });
            } catch (error) {
                console.warn(error);
            }
        },

        getDescription: function (tag) {
            if (Array.isArray(tag)) {
                return tag.map((item) => item.description).join(', ');
            }
            return tag.description;
        }
    });
});