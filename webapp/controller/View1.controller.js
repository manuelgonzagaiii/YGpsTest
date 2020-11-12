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

            var youAreHere = this.getLocation(true);
        },

        onPress: function (oEvent) {
            // Call function
            // Boolean true defines whether to use GPS for higher accuracy when available and network position as fallback.
            // Set to false to get position only based on network location.
            var youAreHere = this.getLocation(true);
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
                    var tags = ExifReader.load(event.target.result);

                    // The MakerNote tag can be really large. Remove it to lower
                    // memory usage if you're parsing a lot of files and saving the
                    // tags.
                    delete tags['MakerNote'];

                    var oJSONModel = this.getView().getModel();
                    var oData = oJSONModel.getData();
                    oData.PhotoMetadata = [];

                    var oImageView = this.getView().byId("imageView");
                    var oModelImg = oImageView.getModel("img");
                    var oDataImg = oModelImg.getData();
                    var aBufferView = new Uint8Array( event.target.result );
                    var oBlob = new Blob( [ aBufferView ], { type: oFile.type } );
                    var oUrlCreator = window.URL || window.webkitURL;
                    oDataImg.photoUrl = oUrlCreator.createObjectURL( oBlob );
                    oModelImg.refresh(true);

                    var oMetaTable = this.getView().byId("metaTable");
                    oMetaTable.getModel().refresh(true);

                    for (name in tags) {
                        vDescription = this.getDescription(tags[name]);
                        if (vDescription !== undefined) {
                            sPhotoMedata = {
                                "TagName": name,
                                "TagValue": vDescription
                            }

                            // var oItem = new sap.m.ColumnListItem({
                            //     cells: [
                            //         new sap.m.Text({
                            //             text: name
                            //         }), new sap.m.Text({
                            //             text: vDescription
                            //         })
                            //     ]
                            // });
                            // var oMetaTable = this.getView().byId("metaTable");

                            oData.PhotoMetadata.push(sPhotoMedata);

                        }
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
        getLocation: function getLocation(enableHighAccuracy) {
            if (navigator.geolocation) {
                var obj = {};
                navigator.geolocation.getCurrentPosition(function (position) {

                    // Accuracy in meters, latitude and longitude
                    obj.ACCURACY = position.coords.accuracy;
                    obj.LATITUDE = position.coords.latitude;
                    obj.LONGITUDE = position.coords.longitude;
                    // this.getView().byId("accuracy").setValue(obj.ACCURACY);
                    // this.getView().byId("latitude").setValue(obj.LATITUDE);
                    // this.getView().byId("longitude").setValue(obj.LONGITUDE);

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
        },

        getDescription: function (tag) {
            if (Array.isArray(tag)) {
                return tag.map((item) => item.description).join(', ');
            }
            return tag.description;
        }
    });
});