
fm.migrations = {};

function fm.migrations.doUpdate(oldVersion, newVersion)
    Game.print_all({"Updater", "Version changed from " .. oldVersion .. " to " .. newVersion .. "."});

    if oldVersion > newVersion then
        Game.print_all({"Updater", "Version downgrade detected. I can't believe you've done this."});
        return;
    end

    if oldVersion < "0.7.0" then
        fm.migrations.to_0_7_0();
    end

end

------------------------------------------------------------------------------------------------------
--INDIVIDUAL UPDATER FUNCTIONS
------------------------------------------------------------------------------------------------------

--Remove the old button and GUI.
function fm.migrations.to_0_7_0()
    --Remove old pre-0.7.0 GUI stuff
    for index, player in pairs(game.players) do
        --Old Top button
        if (player.gui.top.showmenu) then
            player.gui.top.showmenu.destroy();
        end
        --Old GUI window
        if (player.gui.left.factoriomaps) then
            player.gui.left.factoriomaps.destroy();
        end
    end

    global.config = {};
    global._radios = {};
    global.player_data = {};

    --Since this is a migrated to 0.7.0 save we need to make fm.cfg since on_load couldn't
    fm.cfg = Config.new(global.config);
    fm.config.applyDefaults(true);
    fm.gui.showAllMainButton();
end