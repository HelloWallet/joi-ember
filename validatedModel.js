'use strict';

var DS = require('ember-data'),
    Ember = require('ember'),
    _ = require('lodash');

var ValidatedModel = DS.Model.extend({
    validationOptions: {
        abortEarly: false,
        allowUnknown: true
    },
    save: function() {
        var _this = this;
        return this.validate() ?
            this._super.apply(this, arguments) :
            new Ember.RSVP.Promise(function(resolve, reject) {
                var validationErrors = _this.get('validationErrors');
                var errorString = _.map(validationErrors, function(e) {
                    return e.get('type') + ': ' +
                        e.get('path') + ': ' +
                        e.get('message');
                }).join(', ');
                var e = new Error('Validation failed for ' + _this.constructor.toString() + ': ' + errorString);
                e.details = validationErrors;
                reject(e);
            });
    },
    validate: function () {
        var schema = this.get('__schema'),
            joi = this.get('__joi'),
            result = true,
            data = this.serialize();
        if (schema) {
            var valResult = joi.validate(data, schema, this.get('validationOptions'));
            if (valResult.error) {
                console.log('validation failed for ' + this.constructor.toString(), valResult.error, valResult.error.annotate());
                this.set('validationErrors',
                    Ember.A(_.map(valResult.error.details, function(e) {
                        return Ember.Object.create(e);
                    }
                )));
                result = false;
            } else {
                this.set('validationErrors',[]);
                result = true;
            }
        }
        return result;
    }
});

module.exports = {
    ValidatedModel: ValidatedModel
};