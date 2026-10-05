import React from 'react'
import {AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion'
import scenes from './mantenimiento-scenes.json'
export const MAINTENANCE_SCENE_FRAMES = 240
export const MAINTENANCE_TOTAL = scenes.length * MAINTENANCE_SCENE_FRAMES
const Scene: React.FC<{index:number}> = ({index}) => {
 const frame=useCurrentFrame(), [file,title,body]=scenes[index]
 const enter=interpolate(frame,[0,20],[0,1],{extrapolateRight:'clamp'})
 const exit=interpolate(frame,[225,239],[1,0],{extrapolateLeft:'clamp'})
 return <AbsoluteFill style={{opacity:enter*exit,padding:'34px 68px 30px',display:'flex',alignItems:'center'}}>
 <div style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}><div style={{fontWeight:700,fontSize:30}}>FOM <span style={{fontSize:16,color:'#9cafc5',fontWeight:400,marginLeft:14}}>Guía de mantenimiento</span></div><div style={{color:'#91a7bd',fontSize:16}}>SUPERVISOR · {String(index+1).padStart(2,'0')} / 15</div></div>
 <h1 style={{margin:'0 0 22px',fontSize:46,lineHeight:1.12,letterSpacing:-1.2,fontWeight:650,alignSelf:'flex-start'}}>{title}</h1>
 <div style={{height:770,width:1368,position:'relative',border:'1px solid #2a3d51',borderRadius:14,overflow:'hidden',boxShadow:'0 24px 60px #0007',transform:`translateY(${(1-enter)*16}px)`}}><Img src={staticFile(file+'.png')} style={{width:'100%',height:'100%',objectFit:'contain',background:'#08121c'}}/></div>
 <p style={{fontSize:25,lineHeight:1.45,color:'#c5d6e8',margin:'20px 0 0',maxWidth:1580,textAlign:'center'}}>{body}</p>
 <div style={{position:'absolute',bottom:13,left:68,color:'#7890a8',fontSize:12}}>Pantallas explicativas · Datos de demostración</div>
 </AbsoluteFill>
}
export const MantenimientoSupervisor:React.FC=()=>{
 const frame=useCurrentFrame()
 return <AbsoluteFill style={{background:'#090f15',color:'#eef4fc',fontFamily:'Arial, sans-serif'}}>

 {scenes.map((_,index)=><Sequence key={index} from={index*MAINTENANCE_SCENE_FRAMES} durationInFrames={MAINTENANCE_SCENE_FRAMES}><Scene index={index}/></Sequence>)}
 <div style={{position:'absolute',bottom:0,left:0,height:3,width:`${100*frame/(MAINTENANCE_TOTAL-1)}%`,background:'#349bfa'}}/>
 </AbsoluteFill>
}
