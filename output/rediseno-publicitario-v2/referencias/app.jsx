import React from 'react';
import {createRoot} from 'react-dom/client';
import {PhoneFrame,ScreenInicio,ScreenInspeccion,ScreenMantenimiento} from '/src/components/PhoneMockup.jsx';
createRoot(document.getElementById('root')).render(<main style={{padding:32,width:1152}}><p style={{color:'#ABB3BF'}}>FOM DRIVER · Referencias del producto · Pantallas recreadas con datos de ejemplo</p><div style={{display:'flex',gap:40,alignItems:'start'}}>{[ScreenInicio,ScreenInspeccion,ScreenMantenimiento].map((Screen,i)=><div key={i} style={{width:340}}><PhoneFrame><Screen/></PhoneFrame></div>)}</div></main>);
