/**
 * Created with JetBrains WebStorm.
 * User: mharris
 * Date: 7/30/12
 * Time: 3:41 PM
 * To change this template use File | Settings | File Templates.
 */

define(['./graft','./tropism','./sower'],function(graft, tropism, sower){
    console.log('Garden loaded');

    //Wire up circular references
    graft.setTropism(tropism);
    tropism.setGraft(graft);

    return {
        graft: graft,
        tropism: tropism,
        sower: sower
    };
});