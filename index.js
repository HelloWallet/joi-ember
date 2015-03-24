'use strict';

var DS = require('ember-data'),
    _ = require('lodash'),
    // ApplicationSerializer = require('./applicationSerializer').ApplicationSerializer,
    ValidatedModel = require('./validatedModel').ValidatedModel;

var createSerializer = function(ns, schema, primaryKey, relationships, serializer) {
    var serializerName = schema.tags[schema.tags.length-1].capitalize() + 'Serializer';
    ns[serializerName] = serializer.extend({
        primaryKey: primaryKey//,
        // attrs: _.reduce(relationships, function(result, key) {
        //     result[key] = {embedded: 'always'};
        //     return result;
        // }, {})
    });
};

var processAttribute = function(properties,name,type) {
    if (type === 'date') { type = 'moment'; }
    properties[name] = DS.attr(type);
};

var processObject = function(namespace, schema, createModel, serializer) {
    var properties = {}, relationships = [];
    var primaryKey;
    var attributes = schema.children;

    for (var _attrName in attributes) {
        if (attributes.hasOwnProperty(_attrName)) {
            var attrVal = attributes[_attrName],
                type = attrVal.type,
                tagName = '',
                dashName = '';

            if (type === 'array') {
                var arraySchema = attrVal.includes[0];
                var subArrayType = arraySchema.type;
                if (subArrayType === 'object') {
                    // use the latest defined tag as the name of the object
                    // this allows us to use objects that already have a tag
                    // and are being included as embedded records by re-tagging them
                    tagName = arraySchema.tags[arraySchema.tags.length-1];
                    dashName = tagName.dasherize();

                    processObject(namespace, arraySchema, true, serializer);
                    properties[_attrName] = DS.hasManyFragments(dashName, {defaultValue: []});
                    relationships.push(_attrName);
                } else {
                    processAttribute(properties, _attrName, subArrayType+'Array');
                }
            } else if (type === 'object') {
                // use the latest defined tag as the name of the object
                // this allows us to use objects that already have a tag
                // and are being included as embedded records by re-tagging them
                tagName = attrVal.tags[attrVal.tags.length-1];
                dashName = tagName.dasherize();

                processObject(namespace, attrVal, true, serializer);
                properties[_attrName] = DS.hasOneFragment(dashName);
                relationships.push(_attrName);
            } else {
                processAttribute(properties, _attrName, type);
                if (attrVal.meta && attrVal.meta[0].primaryKey) {
                    primaryKey = _attrName;
                }
            }
        }
    }

    var modelName = schema.tags[schema.tags.length-1].capitalize();
    if (createModel) {
        if (!namespace[modelName]) {
            namespace[modelName] = DS.ModelFragment.extend(properties);
        }
    } else {
        createSerializer(namespace, schema, primaryKey, relationships, serializer);
    }

    return properties;
};

module.exports = {
    ValidationBase: function(schema, modelName, joi, serializer) {
        // this method is expected to be merged
        // to the Ember namespace object (i.e. App)
        // so the caller scope will be the correct
        // namespace to add model objects
        var ns = this;

        var properties = processObject(ns, schema.describe(), false, serializer);

        // attach schema & joi to properties of model
        // so we can use it for full validation
        properties.__schema = schema;
        properties.__joi = joi;

        return ValidatedModel.extend(properties);
    }
};