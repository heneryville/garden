/**
 * Created with JetBrains WebStorm.
 * User: mharris
 * Date: 6/6/12
 * Time: 9:53 AM
 * To change this template use File | Settings | File Templates.
 */

/*
Dependencies:
-templateLoader
-dust
-underscore
-jQuery (for deferred)
 */

/*
Changes from server side version:
-Wrapped in IIF and set to sower.
-Change from using deferred to jQuery for deferred
-Better error messages when a child seed can't be found
 */

define(['dustjs-linkedin', '_'],function(dust, _){
    // Don't compress. TODO:This supresses white-space compression. Conditionally compress on PROD
    dust.optimizers.format = function(ctx, node){ return node};

    var base = dust.makeBase({
        render: function(chunk, context, bodies, params){
            var seedName = params.seed;
            var data = undefined;


            if(!params.data || params.data === '.')
                data = context.current();
            else
                data = context.get(params.data);
            var seed = sower.aquire(seedName)
            if(!seed) throw "Could not find seed: " + seedName;
            seed = seed.create(data);
            return chunk.map(function(chunk){
                sower.materialize(seed).done(function(out){
                        chunk.end(out);
                    }
                );
            });
        }
    });
    var seedCache = {}

    function prepare(seed, promises) {
        if(seed.template)
        {
            promises.push(templateloader.registerTemplate(seed.template));
        }
        if(seed.children) {
            _(seed.children).each(function(iter){ prepare(iter, promises)});
        }
    }

    var tools = { };

    function provide(name, seed){
        seedCache[name] = seed;
    }

    function aquire(name) {
        return seedCache[name];
    }

    function prepare(seed) {
        var promises = [];
        prepare(seed, promises);
        return $.when(promises);
    }

    function materialize(seed){
        var def = new $.Deferred()
        var viewModel = {};
        if(_.isFunction(seed.transform))
            _.extend(viewModel,seed.transform(tools))
        if(seed.viewmodel)
            _.extend(viewModel,seed.viewmodel)

        var templateName = seed.template;
        templateloader.aquire(templateName).done(function(){
            dust.render(templateName, base.push(viewModel),function(err,out){
                if(err)
                    def.reject(err);
                else
                    def.resolve(out);
            });
        }).fail(def.reject);
        return def.promise();
    };

    return {
        materialize: materialize,
        prepare: prepare,
        aquire: aquire,
        provide: provide
    }
});

