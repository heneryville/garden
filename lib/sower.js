/**acquire
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

function defineSower(_, dust){

    function makeRender(seedName, data) {
        return function(chunk){
            return chunk.map(function(chunk){
                acquire(seedName, function(err,seed){
                    if(!seed) {
                        return 'Could not find seed ' + seedName;
                    }
                    seed = seed.create(data);
                    materialize(seed, function(err, out){
                        chunk.end(out);
                    });
                });
            });
        }
    }

    function render(chunk, context, bodies, params){
        var seedName = params.seed;
        var data = undefined;

        console.log('Calling render for: ' + seedName);

        if(!params.data || params.data === '.')
            data = context.current();
        else
            data = context.get(params.data);
        return makeRender(seedName, data)(chunk);
    };

    var base = dust.makeBase({
        render: render
    });

    var tools = {
        render: function(seedName, data) {
            return makeRender(seedName, data);
        }
    };

    function acquire(name, callback) {
        try{
            require([name], function(seed){
                if(!seed) {
                    callback('Could not find seed' + name);
                    return;
                }
                callback(undefined, seed);
            });
        }
        catch(err) {
            callback(err);
            console.log('Failed to acquire seed: ' + name);
            console.log(err);
        }
    }

    function prepareData(seed, callback) {
        var viewModel = {};
        if(seed.viewmodel)
            _.extend(viewModel,seed.viewmodel)
        //Call the transform function (which is async)
        if(_.isFunction(seed.transform)) {
            seed.transform(tools, function(err, data){
                if(err) { callback(err); return;}
                _.extend(viewModel,data);
                callback(undefined, viewModel);
            });
        }else {
            callback(undefined,viewModel);
        }
    }

    function materialize(seed,callback){
        prepareData(seed,function(err, viewModel){
            if(err) {callback(err); return;}
            var templateName = seed.template;
            try{
                console.log('Rendering template: ' + templateName)
                //--Server side, the templates are already loaded, so just dust render
                if(typeof module !== 'undefined' && typeof exports !== 'undefined' ) {
                    dust.render(templateName, base.push(viewModel),callback);
                }
                else {
                    require(['template!/node_modules/' + templateName + '.html'],function(template){
                        console.log('Template loaded for: ' + templateName)
                        template.render(base.push(viewModel), callback);
                    });
                }
            }catch(err){
                console.log('Could not load template: ' + templateName + ". Error=" + err)
                callback(err);
            }
        })

    };

    return {
        materialize: materialize,
        acquire: acquire
    }
}
define(['underscore', 'amddust'],defineSower);

