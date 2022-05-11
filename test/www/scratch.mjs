import GAppData from "@tharious/gappdata";

window.run = async function(){
    window.gappdata = new GAppData(window.clientId);
    window.l = await window.gappdata.list();
    const id = window.l[0].id;
    console.log(id);
    await window.gappdata.update(id, {});
    window.g = await window.gappdata.get(id);
}
