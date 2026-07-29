begin;

-- Funções PostgreSQL recebem EXECUTE para PUBLIC por padrão.
-- O AgroFarm trabalha com usuário autenticado e RPCs explicitamente autorizadas.
revoke execute on all functions in schema agrofarm from public;
revoke execute on all functions in schema agrofarm from anon;

-- Função usada internamente pelas políticas RLS.
grant execute on function agrofarm.owns_farm(uuid) to authenticated;

-- RPCs permitidas ao jogo autenticado.
grant execute on function agrofarm.bootstrap_player(uuid) to authenticated;
grant execute on function agrofarm.set_game_mode(text) to authenticated;
grant execute on function agrofarm.set_selected_crop(text) to authenticated;
grant execute on function agrofarm.upgrade_headquarters() to authenticated;
grant execute on function agrofarm.upgrade_warehouse() to authenticated;
grant execute on function agrofarm.plant_crop(integer, text) to authenticated;
grant execute on function agrofarm.care_crop(integer, text) to authenticated;
grant execute on function agrofarm.harvest_crop(integer) to authenticated;
grant execute on function agrofarm.sell_crop(text) to authenticated;
grant execute on function agrofarm.buy_machine(text) to authenticated;
grant execute on function agrofarm.repair_machine(text) to authenticated;
grant execute on function agrofarm.set_machine_automation(text, boolean) to authenticated;
grant execute on function agrofarm.run_automation_cycle() to authenticated;

commit;
