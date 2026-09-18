// Optional imperative WebMCP bridge. Only actions already offered on the page run.
export function registerWorldTools({read,act}) {
  const context=document.modelContext;
  if(!context?.registerTool)return;
  const lifecycle=new AbortController();
  const specs=[{
    name:'read_wudao_scene',title:'查看眼前局面',description:'Read only the current visible scene, known objects, and available narrative actions. Does not reveal hidden game state.',
    inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},
    execute(input){if(input&&Object.keys(input).length)throw new Error('No arguments are accepted.');return read();},
  },{
    name:'perform_wudao_visible_action',title:'选择眼前行动',description:'Perform one action currently offered by a visible game button. Narrative choices may spend time or resources and advance the story. Read the current scene first.',
    inputSchema:{type:'object',properties:{action:{type:'string'},value:{type:'string'}},required:['action','value'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},
    execute(input){if(!input||typeof input.action!=='string'||typeof input.value!=='string'||Object.keys(input).some(k=>!['action','value'].includes(k)))throw new Error('Expected action and value strings.');return act(input.action,input.value);},
  }];
  for(const spec of specs){try{void Promise.resolve(context.registerTool(spec,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
