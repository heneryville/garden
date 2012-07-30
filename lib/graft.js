//TODO: Import assemblies using AMD, rather than implied

//Dependencies:
// jQuery ($)
// Underscore (_)
// shrink (or at least some behavior registry)
// Some kind of repo provider interface

define(['underscore', 'tropism'],function(_, tropism){
    var graftedReg = {};
    function alreadyGrafted(element) {
        if(!element.data) element = $(element);
        return $(element).data('grafted');
    }

    function markGrafted(element) {
        //We're storing if already grafted in the data-grafted value
        if(!element.data) element = $(element);
        element.data('grafted', true);
    }

    function scan(scope) {
        if(!scope) scope = $('body');
        var graftables = $('[graft-behavior]', scope);
        console.log('Graft start');
        graftables.each(function(indx, toGraft){
            if(!alreadyGrafted(toGraft)) {
                graft(toGraft);
            }
        });
        console.log('Graft end');
    }

    function graft(toGraft) {
        var $toGraft = $(toGraft);
        var repoName = $toGraft.attr('graft-repo');
        var id = $toGraft.attr('graft-id');
        var model = undefined;
        if(repoName && id) {
            model = Todos.find(id);  //Todo: We should also being looking up the repo in some kind repo provider.
        }

        var behaviorName = $toGraft.attr('graft-behavior');
        tropism.aquire(behaviorName, toGraft, model, function(err, instance) {
            //Todo.
            //if(instance) console.log('' + toGraft + ' grafted to ' + behaviorName);
            if(err || !instance) console.log('Failed to graft element: ' + err)
            //$(toGraft).data('behavior', instance); //TODO: This will probably cause memory leaks. Remove it when not debugging.
            markGrafted(toGraft);
        });
    }

    return {
        graft: graft,
        scan: scan
    };
});
