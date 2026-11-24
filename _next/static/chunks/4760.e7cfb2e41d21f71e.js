"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[4760],{13638:(e,t,r)=>{r.d(t,{d:()=>d});var n=r(88945),i=r(12115),o=r(85339),a=r(60099);let s=parseInt(o.sPf.replace(/\D+/g,""));class l extends o.BKk{constructor(e=new o.I9Y){super({uniforms:{inputBuffer:new o.nc$(null),depthBuffer:new o.nc$(null),resolution:new o.nc$(new o.I9Y),texelSize:new o.nc$(new o.I9Y),halfTexelSize:new o.nc$(new o.I9Y),kernel:new o.nc$(0),scale:new o.nc$(1),cameraNear:new o.nc$(0),cameraFar:new o.nc$(1),minDepthThreshold:new o.nc$(0),maxDepthThreshold:new o.nc$(1),depthScale:new o.nc$(0),depthToBlurRatioBias:new o.nc$(.25)},fragmentShader:`#include <common>
        #include <dithering_pars_fragment>      
        uniform sampler2D inputBuffer;
        uniform sampler2D depthBuffer;
        uniform float cameraNear;
        uniform float cameraFar;
        uniform float minDepthThreshold;
        uniform float maxDepthThreshold;
        uniform float depthScale;
        uniform float depthToBlurRatioBias;
        varying vec2 vUv;
        varying vec2 vUv0;
        varying vec2 vUv1;
        varying vec2 vUv2;
        varying vec2 vUv3;

        void main() {
          float depthFactor = 0.0;
          
          #ifdef USE_DEPTH
            vec4 depth = texture2D(depthBuffer, vUv);
            depthFactor = smoothstep(minDepthThreshold, maxDepthThreshold, 1.0-(depth.r * depth.a));
            depthFactor *= depthScale;
            depthFactor = max(0.0, min(1.0, depthFactor + 0.25));
          #endif
          
          vec4 sum = texture2D(inputBuffer, mix(vUv0, vUv, depthFactor));
          sum += texture2D(inputBuffer, mix(vUv1, vUv, depthFactor));
          sum += texture2D(inputBuffer, mix(vUv2, vUv, depthFactor));
          sum += texture2D(inputBuffer, mix(vUv3, vUv, depthFactor));
          gl_FragColor = sum * 0.25 ;

          #include <dithering_fragment>
          #include <tonemapping_fragment>
          #include <${s>=154?"colorspace_fragment":"encodings_fragment"}>
        }`,vertexShader:`uniform vec2 texelSize;
        uniform vec2 halfTexelSize;
        uniform float kernel;
        uniform float scale;
        varying vec2 vUv;
        varying vec2 vUv0;
        varying vec2 vUv1;
        varying vec2 vUv2;
        varying vec2 vUv3;

        void main() {
          vec2 uv = position.xy * 0.5 + 0.5;
          vUv = uv;

          vec2 dUv = (texelSize * vec2(kernel) + halfTexelSize) * scale;
          vUv0 = vec2(uv.x - dUv.x, uv.y + dUv.y);
          vUv1 = vec2(uv.x + dUv.x, uv.y + dUv.y);
          vUv2 = vec2(uv.x + dUv.x, uv.y - dUv.y);
          vUv3 = vec2(uv.x - dUv.x, uv.y - dUv.y);

          gl_Position = vec4(position.xy, 1.0, 1.0);
        }`,blending:o.XIg,depthWrite:!1,depthTest:!1}),this.toneMapped=!1,this.setTexelSize(e.x,e.y),this.kernel=new Float32Array([0,1,2,2,3])}setTexelSize(e,t){this.uniforms.texelSize.value.set(e,t),this.uniforms.halfTexelSize.value.set(e,t).multiplyScalar(.5)}setResolution(e){this.uniforms.resolution.value.copy(e)}}class u{constructor({gl:e,resolution:t,width:r=500,height:n=500,minDepthThreshold:i=0,maxDepthThreshold:a=1,depthScale:s=0,depthToBlurRatioBias:u=.25}){this.renderToScreen=!1,this.renderTargetA=new o.nWS(t,t,{minFilter:o.k6q,magFilter:o.k6q,stencilBuffer:!1,depthBuffer:!1,type:o.ix0}),this.renderTargetB=this.renderTargetA.clone(),this.convolutionMaterial=new l,this.convolutionMaterial.setTexelSize(1/r,1/n),this.convolutionMaterial.setResolution(new o.I9Y(r,n)),this.scene=new o.Z58,this.camera=new o.i7d,this.convolutionMaterial.uniforms.minDepthThreshold.value=i,this.convolutionMaterial.uniforms.maxDepthThreshold.value=a,this.convolutionMaterial.uniforms.depthScale.value=s,this.convolutionMaterial.uniforms.depthToBlurRatioBias.value=u,this.convolutionMaterial.defines.USE_DEPTH=s>0;let c=new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),d=new Float32Array([0,0,2,0,0,2]),f=new o.LoY;f.setAttribute("position",new o.THS(c,3)),f.setAttribute("uv",new o.THS(d,2)),this.screen=new o.eaF(f,this.convolutionMaterial),this.screen.frustumCulled=!1,this.scene.add(this.screen)}render(e,t,r){let n,i,o,a=this.scene,s=this.camera,l=this.renderTargetA,u=this.renderTargetB,c=this.convolutionMaterial,d=c.uniforms;d.depthBuffer.value=t.depthTexture;let f=c.kernel,h=t;for(i=0,o=f.length-1;i<o;++i)n=(1&i)==0?l:u,d.kernel.value=f[i],d.inputBuffer.value=h.texture,e.setRenderTarget(n),e.render(a,s),h=n;d.kernel.value=f[i],d.inputBuffer.value=h.texture,e.setRenderTarget(this.renderToScreen?null:r),e.render(a,s)}}class c extends o._4j{constructor(e={}){super(e),this._tDepth={value:null},this._distortionMap={value:null},this._tDiffuse={value:null},this._tDiffuseBlur={value:null},this._textureMatrix={value:null},this._hasBlur={value:!1},this._mirror={value:0},this._mixBlur={value:0},this._blurStrength={value:.5},this._minDepthThreshold={value:.9},this._maxDepthThreshold={value:1},this._depthScale={value:0},this._depthToBlurRatioBias={value:.25},this._distortion={value:1},this._mixContrast={value:1},this.setValues(e)}onBeforeCompile(e){var t;null!=(t=e.defines)&&t.USE_UV||(e.defines.USE_UV=""),e.uniforms.hasBlur=this._hasBlur,e.uniforms.tDiffuse=this._tDiffuse,e.uniforms.tDepth=this._tDepth,e.uniforms.distortionMap=this._distortionMap,e.uniforms.tDiffuseBlur=this._tDiffuseBlur,e.uniforms.textureMatrix=this._textureMatrix,e.uniforms.mirror=this._mirror,e.uniforms.mixBlur=this._mixBlur,e.uniforms.mixStrength=this._blurStrength,e.uniforms.minDepthThreshold=this._minDepthThreshold,e.uniforms.maxDepthThreshold=this._maxDepthThreshold,e.uniforms.depthScale=this._depthScale,e.uniforms.depthToBlurRatioBias=this._depthToBlurRatioBias,e.uniforms.distortion=this._distortion,e.uniforms.mixContrast=this._mixContrast,e.vertexShader=`
        uniform mat4 textureMatrix;
        varying vec4 my_vUv;
      ${e.vertexShader}`,e.vertexShader=e.vertexShader.replace("#include <project_vertex>",`#include <project_vertex>
        my_vUv = textureMatrix * vec4( position, 1.0 );
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );`),e.fragmentShader=`
        uniform sampler2D tDiffuse;
        uniform sampler2D tDiffuseBlur;
        uniform sampler2D tDepth;
        uniform sampler2D distortionMap;
        uniform float distortion;
        uniform float cameraNear;
			  uniform float cameraFar;
        uniform bool hasBlur;
        uniform float mixBlur;
        uniform float mirror;
        uniform float mixStrength;
        uniform float minDepthThreshold;
        uniform float maxDepthThreshold;
        uniform float mixContrast;
        uniform float depthScale;
        uniform float depthToBlurRatioBias;
        varying vec4 my_vUv;
        ${e.fragmentShader}`,e.fragmentShader=e.fragmentShader.replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>

      float distortionFactor = 0.0;
      #ifdef USE_DISTORTION
        distortionFactor = texture2D(distortionMap, vUv).r * distortion;
      #endif

      vec4 new_vUv = my_vUv;
      new_vUv.x += distortionFactor;
      new_vUv.y += distortionFactor;

      vec4 base = texture2DProj(tDiffuse, new_vUv);
      vec4 blur = texture2DProj(tDiffuseBlur, new_vUv);

      vec4 merge = base;

      #ifdef USE_NORMALMAP
        vec2 normal_uv = vec2(0.0);
        vec4 normalColor = texture2D(normalMap, vUv * normalScale);
        vec3 my_normal = normalize( vec3( normalColor.r * 2.0 - 1.0, normalColor.b,  normalColor.g * 2.0 - 1.0 ) );
        vec3 coord = new_vUv.xyz / new_vUv.w;
        normal_uv = coord.xy + coord.z * my_normal.xz * 0.05;
        vec4 base_normal = texture2D(tDiffuse, normal_uv);
        vec4 blur_normal = texture2D(tDiffuseBlur, normal_uv);
        merge = base_normal;
        blur = blur_normal;
      #endif

      float depthFactor = 0.0001;
      float blurFactor = 0.0;

      #ifdef USE_DEPTH
        vec4 depth = texture2DProj(tDepth, new_vUv);
        depthFactor = smoothstep(minDepthThreshold, maxDepthThreshold, 1.0-(depth.r * depth.a));
        depthFactor *= depthScale;
        depthFactor = max(0.0001, min(1.0, depthFactor));

        #ifdef USE_BLUR
          blur = blur * min(1.0, depthFactor + depthToBlurRatioBias);
          merge = merge * min(1.0, depthFactor + 0.5);
        #else
          merge = merge * depthFactor;
        #endif

      #endif

      float reflectorRoughnessFactor = roughness;
      #ifdef USE_ROUGHNESSMAP
        vec4 reflectorTexelRoughness = texture2D( roughnessMap, vUv );
        reflectorRoughnessFactor *= reflectorTexelRoughness.g;
      #endif

      #ifdef USE_BLUR
        blurFactor = min(1.0, mixBlur * reflectorRoughnessFactor);
        merge = mix(merge, blur, blurFactor);
      #endif

      vec4 newMerge = vec4(0.0, 0.0, 0.0, 1.0);
      newMerge.r = (merge.r - 0.5) * mixContrast + 0.5;
      newMerge.g = (merge.g - 0.5) * mixContrast + 0.5;
      newMerge.b = (merge.b - 0.5) * mixContrast + 0.5;

      diffuseColor.rgb = diffuseColor.rgb * ((1.0 - min(1.0, mirror)) + newMerge.rgb * mixStrength);
      `)}get tDiffuse(){return this._tDiffuse.value}set tDiffuse(e){this._tDiffuse.value=e}get tDepth(){return this._tDepth.value}set tDepth(e){this._tDepth.value=e}get distortionMap(){return this._distortionMap.value}set distortionMap(e){this._distortionMap.value=e}get tDiffuseBlur(){return this._tDiffuseBlur.value}set tDiffuseBlur(e){this._tDiffuseBlur.value=e}get textureMatrix(){return this._textureMatrix.value}set textureMatrix(e){this._textureMatrix.value=e}get hasBlur(){return this._hasBlur.value}set hasBlur(e){this._hasBlur.value=e}get mirror(){return this._mirror.value}set mirror(e){this._mirror.value=e}get mixBlur(){return this._mixBlur.value}set mixBlur(e){this._mixBlur.value=e}get mixStrength(){return this._blurStrength.value}set mixStrength(e){this._blurStrength.value=e}get minDepthThreshold(){return this._minDepthThreshold.value}set minDepthThreshold(e){this._minDepthThreshold.value=e}get maxDepthThreshold(){return this._maxDepthThreshold.value}set maxDepthThreshold(e){this._maxDepthThreshold.value=e}get depthScale(){return this._depthScale.value}set depthScale(e){this._depthScale.value=e}get depthToBlurRatioBias(){return this._depthToBlurRatioBias.value}set depthToBlurRatioBias(e){this._depthToBlurRatioBias.value=e}get distortion(){return this._distortion.value}set distortion(e){this._distortion.value=e}get mixContrast(){return this._mixContrast.value}set mixContrast(e){this._mixContrast.value=e}}let d=i.forwardRef(({mixBlur:e=0,mixStrength:t=1,resolution:r=256,blur:s=[0,0],minDepthThreshold:l=.9,maxDepthThreshold:d=1,depthScale:f=0,depthToBlurRatioBias:h=.25,mirror:v=0,distortion:m=1,mixContrast:p=1,distortionMap:x,reflectorOffset:g=0,...y},w)=>{(0,a.e)({MeshReflectorMaterialImpl:c});let S=(0,a.C)(({gl:e})=>e),b=(0,a.C)(({camera:e})=>e),_=(0,a.C)(({scene:e})=>e),U=(s=Array.isArray(s)?s:[s,s])[0]+s[1]>0,D=s[0],E=s[1],M=i.useRef(null);i.useImperativeHandle(w,()=>M.current,[]);let[T]=i.useState(()=>new o.Zcv),[B]=i.useState(()=>new o.Pq0),[z]=i.useState(()=>new o.Pq0),[A]=i.useState(()=>new o.Pq0),[P]=i.useState(()=>new o.kn4),[C]=i.useState(()=>new o.Pq0(0,0,-1)),[L]=i.useState(()=>new o.IUQ),[R]=i.useState(()=>new o.Pq0),[O]=i.useState(()=>new o.Pq0),[F]=i.useState(()=>new o.IUQ),[I]=i.useState(()=>new o.kn4),[H]=i.useState(()=>new o.ubm),j=i.useCallback(()=>{var e;let t=M.current.parent||(null==(e=M.current)||null==(e=e.__r3f.parent)?void 0:e.object);if(!t||(z.setFromMatrixPosition(t.matrixWorld),A.setFromMatrixPosition(b.matrixWorld),P.extractRotation(t.matrixWorld),B.set(0,0,1),B.applyMatrix4(P),z.addScaledVector(B,g),R.subVectors(z,A),R.dot(B)>0))return;R.reflect(B).negate(),R.add(z),P.extractRotation(b.matrixWorld),C.set(0,0,-1),C.applyMatrix4(P),C.add(A),O.subVectors(z,C),O.reflect(B).negate(),O.add(z),H.position.copy(R),H.up.set(0,1,0),H.up.applyMatrix4(P),H.up.reflect(B),H.lookAt(O),H.far=b.far,H.updateMatrixWorld(),H.projectionMatrix.copy(b.projectionMatrix),I.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),I.multiply(H.projectionMatrix),I.multiply(H.matrixWorldInverse),I.multiply(t.matrixWorld),T.setFromNormalAndCoplanarPoint(B,z),T.applyMatrix4(H.matrixWorldInverse),L.set(T.normal.x,T.normal.y,T.normal.z,T.constant);let r=H.projectionMatrix;F.x=(Math.sign(L.x)+r.elements[8])/r.elements[0],F.y=(Math.sign(L.y)+r.elements[9])/r.elements[5],F.z=-1,F.w=(1+r.elements[10])/r.elements[14],L.multiplyScalar(2/L.dot(F)),r.elements[2]=L.x,r.elements[6]=L.y,r.elements[10]=L.z+1,r.elements[14]=L.w},[b,g]),[W,k,N,q]=i.useMemo(()=>{let n={minFilter:o.k6q,magFilter:o.k6q,type:o.ix0},i=new o.nWS(r,r,n);i.depthBuffer=!0,i.depthTexture=new o.VCu(r,r),i.depthTexture.format=o.zdS,i.depthTexture.type=o.cHt;let a=new o.nWS(r,r,n),s=new u({gl:S,resolution:r,width:D,height:E,minDepthThreshold:l,maxDepthThreshold:d,depthScale:f,depthToBlurRatioBias:h}),c={mirror:v,textureMatrix:I,mixBlur:e,tDiffuse:i.texture,tDepth:i.depthTexture,tDiffuseBlur:a.texture,hasBlur:U,mixStrength:t,minDepthThreshold:l,maxDepthThreshold:d,depthScale:f,depthToBlurRatioBias:h,distortion:m,distortionMap:x,mixContrast:p,"defines-USE_BLUR":U?"":void 0,"defines-USE_DEPTH":f>0?"":void 0,"defines-USE_DISTORTION":x?"":void 0};return[i,a,s,c]},[S,D,E,I,r,v,U,e,t,l,d,f,h,m,x,p]);return(0,a.D)(()=>{var e;let t=M.current.parent||(null==(e=M.current)||null==(e=e.__r3f.parent)?void 0:e.object);if(!t)return;t.visible=!1;let r=S.xr.enabled,n=S.shadowMap.autoUpdate;j(),S.xr.enabled=!1,S.shadowMap.autoUpdate=!1,S.setRenderTarget(W),S.state.buffers.depth.setMask(!0),S.autoClear||S.clear(),S.render(_,H),U&&N.render(S,W,k),S.xr.enabled=r,S.shadowMap.autoUpdate=n,t.visible=!0,S.setRenderTarget(null)}),i.createElement("meshReflectorMaterialImpl",(0,n.A)({attach:"material",key:"key"+q["defines-USE_BLUR"]+q["defines-USE_DEPTH"]+q["defines-USE_DISTORTION"],ref:M},q,y))})},30258:(e,t,r)=>{r.d(t,{Hl:()=>d});var n=r(60099),i=r(12115),o=r(87548);function a(e,t){let r;return(...n)=>{window.clearTimeout(r),r=window.setTimeout(()=>e(...n),t)}}let s=["x","y","top","bottom","left","right","width","height"];var l=r(54735),u=r(95155);function c({ref:e,children:t,fallback:r,resize:l,style:c,gl:d,events:f=n.f,eventSource:h,eventPrefix:v,shadows:m,linear:p,flat:x,legacy:g,orthographic:y,frameloop:w,dpr:S,performance:b,raycaster:_,camera:U,scene:D,onPointerMissed:E,onCreated:M,...T}){i.useMemo(()=>(0,n.e)(o),[]);let B=(0,n.u)(),[z,A]=function({debounce:e,scroll:t,polyfill:r,offsetSize:n}={debounce:0,scroll:!1,offsetSize:!1}){var o,l,u;let c=r||("undefined"==typeof window?class{}:window.ResizeObserver);if(!c)throw Error("This browser does not support ResizeObserver out of the box. See: https://github.com/react-spring/react-use-measure/#resize-observer-polyfills");let[d,f]=(0,i.useState)({left:0,top:0,width:0,height:0,bottom:0,right:0,x:0,y:0}),h=(0,i.useRef)({element:null,scrollContainers:null,resizeObserver:null,lastBounds:d,orientationHandler:null}),v=e?"number"==typeof e?e:e.scroll:null,m=e?"number"==typeof e?e:e.resize:null,p=(0,i.useRef)(!1);(0,i.useEffect)(()=>(p.current=!0,()=>void(p.current=!1)));let[x,g,y]=(0,i.useMemo)(()=>{let e=()=>{let e,t;if(!h.current.element)return;let{left:r,top:i,width:o,height:a,bottom:l,right:u,x:c,y:d}=h.current.element.getBoundingClientRect(),v={left:r,top:i,width:o,height:a,bottom:l,right:u,x:c,y:d};h.current.element instanceof HTMLElement&&n&&(v.height=h.current.element.offsetHeight,v.width=h.current.element.offsetWidth),Object.freeze(v),p.current&&(e=h.current.lastBounds,t=v,!s.every(r=>e[r]===t[r]))&&f(h.current.lastBounds=v)};return[e,m?a(e,m):e,v?a(e,v):e]},[f,n,v,m]);function w(){h.current.scrollContainers&&(h.current.scrollContainers.forEach(e=>e.removeEventListener("scroll",y,!0)),h.current.scrollContainers=null),h.current.resizeObserver&&(h.current.resizeObserver.disconnect(),h.current.resizeObserver=null),h.current.orientationHandler&&("orientation"in screen&&"removeEventListener"in screen.orientation?screen.orientation.removeEventListener("change",h.current.orientationHandler):"onorientationchange"in window&&window.removeEventListener("orientationchange",h.current.orientationHandler))}function S(){h.current.element&&(h.current.resizeObserver=new c(y),h.current.resizeObserver.observe(h.current.element),t&&h.current.scrollContainers&&h.current.scrollContainers.forEach(e=>e.addEventListener("scroll",y,{capture:!0,passive:!0})),h.current.orientationHandler=()=>{y()},"orientation"in screen&&"addEventListener"in screen.orientation?screen.orientation.addEventListener("change",h.current.orientationHandler):"onorientationchange"in window&&window.addEventListener("orientationchange",h.current.orientationHandler))}return o=y,l=!!t,(0,i.useEffect)(()=>{if(l)return window.addEventListener("scroll",o,{capture:!0,passive:!0}),()=>void window.removeEventListener("scroll",o,!0)},[o,l]),u=g,(0,i.useEffect)(()=>(window.addEventListener("resize",u),()=>void window.removeEventListener("resize",u)),[u]),(0,i.useEffect)(()=>{w(),S()},[t,y,g]),(0,i.useEffect)(()=>w,[]),[e=>{e&&e!==h.current.element&&(w(),h.current.element=e,h.current.scrollContainers=function e(t){let r=[];if(!t||t===document.body)return r;let{overflow:n,overflowX:i,overflowY:o}=window.getComputedStyle(t);return[n,i,o].some(e=>"auto"===e||"scroll"===e)&&r.push(t),[...r,...e(t.parentElement)]}(e),S())},d,x]}({scroll:!0,debounce:{scroll:50,resize:0},...l}),P=i.useRef(null),C=i.useRef(null);i.useImperativeHandle(e,()=>P.current);let L=(0,n.a)(E),[R,O]=i.useState(!1),[F,I]=i.useState(!1);if(R)throw R;if(F)throw F;let H=i.useRef(null);(0,n.b)(()=>{let e=P.current;A.width>0&&A.height>0&&e&&(H.current||(H.current=(0,n.c)(e)),async function(){await H.current.configure({gl:d,scene:D,events:f,shadows:m,linear:p,flat:x,legacy:g,orthographic:y,frameloop:w,dpr:S,performance:b,raycaster:_,camera:U,size:A,onPointerMissed:(...e)=>null==L.current?void 0:L.current(...e),onCreated:e=>{null==e.events.connect||e.events.connect(h?(0,n.i)(h)?h.current:h:C.current),v&&e.setEvents({compute:(e,t)=>{let r=e[v+"X"],n=e[v+"Y"];t.pointer.set(r/t.size.width*2-1,-(2*(n/t.size.height))+1),t.raycaster.setFromCamera(t.pointer,t.camera)}}),null==M||M(e)}}),H.current.render((0,u.jsx)(B,{children:(0,u.jsx)(n.E,{set:I,children:(0,u.jsx)(i.Suspense,{fallback:(0,u.jsx)(n.B,{set:O}),children:null!=t?t:null})})}))}())}),i.useEffect(()=>{let e=P.current;if(e)return()=>(0,n.d)(e)},[]);let j=h?"none":"auto";return(0,u.jsx)("div",{ref:C,style:{position:"relative",width:"100%",height:"100%",overflow:"hidden",pointerEvents:j,...c},...T,children:(0,u.jsx)("div",{ref:z,style:{width:"100%",height:"100%"},children:(0,u.jsx)("canvas",{ref:P,style:{display:"block"},children:r})})})}function d(e){return(0,u.jsx)(l.Af,{children:(0,u.jsx)(c,{...e})})}r(28870),r(18807),r(49914)},32034:(e,t,r)=>{r.d(t,{_:()=>u});var n=r(88945),i=r(12115),o=r(85339),a=r(60099);let s={uniforms:{tDiffuse:{value:null},h:{value:1/512}},vertexShader:`
      varying vec2 vUv;

      void main() {

        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

      }
  `,fragmentShader:`
    uniform sampler2D tDiffuse;
    uniform float h;

    varying vec2 vUv;

    void main() {

    	vec4 sum = vec4( 0.0 );

    	sum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y ) ) * 0.051;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y ) ) * 0.0918;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y ) ) * 0.12245;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y ) ) * 0.1531;
    	sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y ) ) * 0.1531;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y ) ) * 0.12245;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y ) ) * 0.0918;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y ) ) * 0.051;

    	gl_FragColor = sum;

    }
  `},l={uniforms:{tDiffuse:{value:null},v:{value:1/512}},vertexShader:`
    varying vec2 vUv;

    void main() {

      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

    }
  `,fragmentShader:`

  uniform sampler2D tDiffuse;
  uniform float v;

  varying vec2 vUv;

  void main() {

    vec4 sum = vec4( 0.0 );

    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * 0.051;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * 0.0918;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * 0.12245;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * 0.1531;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * v ) ) * 0.1531;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * v ) ) * 0.12245;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * v ) ) * 0.0918;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * v ) ) * 0.051;

    gl_FragColor = sum;

  }
  `},u=i.forwardRef(({scale:e=10,frames:t=1/0,opacity:r=1,width:u=1,height:c=1,blur:d=1,near:f=0,far:h=10,resolution:v=512,smooth:m=!0,color:p="#000000",depthWrite:x=!1,renderOrder:g,...y},w)=>{let S,b,_=i.useRef(null),U=(0,a.C)(e=>e.scene),D=(0,a.C)(e=>e.gl),E=i.useRef(null);u*=Array.isArray(e)?e[0]:e||1,c*=Array.isArray(e)?e[1]:e||1;let[M,T,B,z,A,P,C]=i.useMemo(()=>{let e=new o.nWS(v,v),t=new o.nWS(v,v);t.texture.generateMipmaps=e.texture.generateMipmaps=!1;let r=new o.bdM(u,c).rotateX(Math.PI/2),n=new o.eaF(r),i=new o.CSG;i.depthTest=i.depthWrite=!1,i.onBeforeCompile=e=>{e.uniforms={...e.uniforms,ucolor:{value:new o.Q1f(p)}},e.fragmentShader=e.fragmentShader.replace("void main() {",`uniform vec3 ucolor;
           void main() {
          `),e.fragmentShader=e.fragmentShader.replace("vec4( vec3( 1.0 - fragCoordZ ), opacity );","vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );")};let a=new o.BKk(s),d=new o.BKk(l);return d.depthTest=a.depthTest=!1,[e,r,i,n,a,d,t]},[v,u,c,e,p]),L=e=>{z.visible=!0,z.material=A,A.uniforms.tDiffuse.value=M.texture,A.uniforms.h.value=e/256,D.setRenderTarget(C),D.render(z,E.current),z.material=P,P.uniforms.tDiffuse.value=C.texture,P.uniforms.v.value=e/256,D.setRenderTarget(M),D.render(z,E.current),z.visible=!1},R=0;return(0,a.D)(()=>{E.current&&(t===1/0||R<t)&&(R++,S=U.background,b=U.overrideMaterial,_.current.visible=!1,U.background=null,U.overrideMaterial=B,D.setRenderTarget(M),D.render(U,E.current),L(d),m&&L(.4*d),D.setRenderTarget(null),_.current.visible=!0,U.overrideMaterial=b,U.background=S)}),i.useImperativeHandle(w,()=>_.current,[]),i.createElement("group",(0,n.A)({"rotation-x":Math.PI/2},y,{ref:_}),i.createElement("mesh",{renderOrder:g,geometry:T,scale:[1,-1,1],rotation:[-Math.PI/2,0,0]},i.createElement("meshBasicMaterial",{transparent:!0,map:M.texture,opacity:r,depthWrite:x})),i.createElement("orthographicCamera",{ref:E,args:[-u/2,u/2,c/2,-c/2,f,h]}))})},35322:(e,t,r)=>{let n,i;r.d(t,{l:()=>L});var o=r(88945),a=r(12115),s=r(85339),l=r(60099);let u=new s.NRn,c=new s.Pq0;class d extends s.CmU{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry",this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute("position",new s.qtW([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute("uv",new s.qtW([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(e){let t=this.attributes.instanceStart,r=this.attributes.instanceEnd;return void 0!==t&&(t.applyMatrix4(e),r.applyMatrix4(e),t.needsUpdate=!0),null!==this.boundingBox&&this.computeBoundingBox(),null!==this.boundingSphere&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let r=new s.LuO(t,6,1);return this.setAttribute("instanceStart",new s.eHs(r,3,0)),this.setAttribute("instanceEnd",new s.eHs(r,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e,t=3){let r;e instanceof Float32Array?r=e:Array.isArray(e)&&(r=new Float32Array(e));let n=new s.LuO(r,2*t,1);return this.setAttribute("instanceColorStart",new s.eHs(n,t,0)),this.setAttribute("instanceColorEnd",new s.eHs(n,t,t)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new s.XJ7(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){null===this.boundingBox&&(this.boundingBox=new s.NRn);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;void 0!==e&&void 0!==t&&(this.boundingBox.setFromBufferAttribute(e),u.setFromBufferAttribute(t),this.boundingBox.union(u))}computeBoundingSphere(){null===this.boundingSphere&&(this.boundingSphere=new s.iyt),null===this.boundingBox&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(void 0!==e&&void 0!==t){let r=this.boundingSphere.center;this.boundingBox.getCenter(r);let n=0;for(let i=0,o=e.count;i<o;i++)c.fromBufferAttribute(e,i),n=Math.max(n,r.distanceToSquared(c)),c.fromBufferAttribute(t,i),n=Math.max(n,r.distanceToSquared(c));this.boundingSphere.radius=Math.sqrt(n),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}}var f=r(87548),h=r(14814);class v extends s.BKk{constructor(e){super({type:"LineMaterial",uniforms:s.LlO.clone(s.LlO.merge([f.UniformsLib.common,f.UniformsLib.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new s.I9Y(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
				#include <common>
				#include <fog_pars_vertex>
				#include <logdepthbuf_pars_vertex>
				#include <clipping_planes_pars_vertex>

				uniform float linewidth;
				uniform vec2 resolution;

				attribute vec3 instanceStart;
				attribute vec3 instanceEnd;

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
						attribute vec4 instanceColorStart;
						attribute vec4 instanceColorEnd;
					#else
						varying vec3 vLineColor;
						attribute vec3 instanceColorStart;
						attribute vec3 instanceColorEnd;
					#endif
				#endif

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#ifdef USE_DASH

					uniform float dashScale;
					attribute float instanceDistanceStart;
					attribute float instanceDistanceEnd;
					varying float vLineDistance;

				#endif

				void trimSegment( const in vec4 start, inout vec4 end ) {

					// trim end segment so it terminates between the camera plane and the near plane

					// conservative estimate of the near plane
					float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
					float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
					float nearEstimate = - 0.5 * b / a;

					float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

					end.xyz = mix( start.xyz, end.xyz, alpha );

				}

				void main() {

					#ifdef USE_COLOR

						vLineColor = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

					#endif

					#ifdef USE_DASH

						vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
						vUv = uv;

					#endif

					float aspect = resolution.x / resolution.y;

					// camera space
					vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
					vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

					#ifdef WORLD_UNITS

						worldStart = start.xyz;
						worldEnd = end.xyz;

					#else

						vUv = uv;

					#endif

					// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
					// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
					// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
					// perhaps there is a more elegant solution -- WestLangley

					bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

					if ( perspective ) {

						if ( start.z < 0.0 && end.z >= 0.0 ) {

							trimSegment( start, end );

						} else if ( end.z < 0.0 && start.z >= 0.0 ) {

							trimSegment( end, start );

						}

					}

					// clip space
					vec4 clipStart = projectionMatrix * start;
					vec4 clipEnd = projectionMatrix * end;

					// ndc space
					vec3 ndcStart = clipStart.xyz / clipStart.w;
					vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

					// direction
					vec2 dir = ndcEnd.xy - ndcStart.xy;

					// account for clip-space aspect ratio
					dir.x *= aspect;
					dir = normalize( dir );

					#ifdef WORLD_UNITS

						// get the offset direction as perpendicular to the view vector
						vec3 worldDir = normalize( end.xyz - start.xyz );
						vec3 offset;
						if ( position.y < 0.5 ) {

							offset = normalize( cross( start.xyz, worldDir ) );

						} else {

							offset = normalize( cross( end.xyz, worldDir ) );

						}

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						float forwardOffset = dot( worldDir, vec3( 0.0, 0.0, 1.0 ) );

						// don't extend the line if we're rendering dashes because we
						// won't be rendering the endcaps
						#ifndef USE_DASH

							// extend the line bounds to encompass  endcaps
							start.xyz += - worldDir * linewidth * 0.5;
							end.xyz += worldDir * linewidth * 0.5;

							// shift the position of the quad so it hugs the forward edge of the line
							offset.xy -= dir * forwardOffset;
							offset.z += 0.5;

						#endif

						// endcaps
						if ( position.y > 1.0 || position.y < 0.0 ) {

							offset.xy += dir * 2.0 * forwardOffset;

						}

						// adjust for linewidth
						offset *= linewidth * 0.5;

						// set the world position
						worldPos = ( position.y < 0.5 ) ? start : end;
						worldPos.xyz += offset;

						// project the worldpos
						vec4 clip = projectionMatrix * worldPos;

						// shift the depth of the projected points so the line
						// segments overlap neatly
						vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
						clip.z = clipPose.z * clip.w;

					#else

						vec2 offset = vec2( dir.y, - dir.x );
						// undo aspect ratio adjustment
						dir.x /= aspect;
						offset.x /= aspect;

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						// endcaps
						if ( position.y < 0.0 ) {

							offset += - dir;

						} else if ( position.y > 1.0 ) {

							offset += dir;

						}

						// adjust for linewidth
						offset *= linewidth;

						// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
						offset /= resolution.y;

						// select end
						vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

						// back to clip space
						offset *= clip.w;

						clip.xy += offset;

					#endif

					gl_Position = clip;

					vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

					#include <logdepthbuf_vertex>
					#include <clipping_planes_vertex>
					#include <fog_vertex>

				}
			`,fragmentShader:`
				uniform vec3 diffuse;
				uniform float opacity;
				uniform float linewidth;

				#ifdef USE_DASH

					uniform float dashOffset;
					uniform float dashSize;
					uniform float gapSize;

				#endif

				varying float vLineDistance;

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#include <common>
				#include <fog_pars_fragment>
				#include <logdepthbuf_pars_fragment>
				#include <clipping_planes_pars_fragment>

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
					#else
						varying vec3 vLineColor;
					#endif
				#endif

				vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

					float mua;
					float mub;

					vec3 p13 = p1 - p3;
					vec3 p43 = p4 - p3;

					vec3 p21 = p2 - p1;

					float d1343 = dot( p13, p43 );
					float d4321 = dot( p43, p21 );
					float d1321 = dot( p13, p21 );
					float d4343 = dot( p43, p43 );
					float d2121 = dot( p21, p21 );

					float denom = d2121 * d4343 - d4321 * d4321;

					float numer = d1343 * d4321 - d1321 * d4343;

					mua = numer / denom;
					mua = clamp( mua, 0.0, 1.0 );
					mub = ( d1343 + d4321 * ( mua ) ) / d4343;
					mub = clamp( mub, 0.0, 1.0 );

					return vec2( mua, mub );

				}

				void main() {

					#include <clipping_planes_fragment>

					#ifdef USE_DASH

						if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

						if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

					#endif

					float alpha = opacity;

					#ifdef WORLD_UNITS

						// Find the closest points on the view ray and the line segment
						vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
						vec3 lineDir = worldEnd - worldStart;
						vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

						vec3 p1 = worldStart + lineDir * params.x;
						vec3 p2 = rayEnd * params.y;
						vec3 delta = p1 - p2;
						float len = length( delta );
						float norm = len / linewidth;

						#ifndef USE_DASH

							#ifdef USE_ALPHA_TO_COVERAGE

								float dnorm = fwidth( norm );
								alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

							#else

								if ( norm > 0.5 ) {

									discard;

								}

							#endif

						#endif

					#else

						#ifdef USE_ALPHA_TO_COVERAGE

							// artifacts appear on some hardware if a derivative is taken within a conditional
							float a = vUv.x;
							float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
							float len2 = a * a + b * b;
							float dlen = fwidth( len2 );

							if ( abs( vUv.y ) > 1.0 ) {

								alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

							}

						#else

							if ( abs( vUv.y ) > 1.0 ) {

								float a = vUv.x;
								float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
								float len2 = a * a + b * b;

								if ( len2 > 1.0 ) discard;

							}

						#endif

					#endif

					vec4 diffuseColor = vec4( diffuse, alpha );
					#ifdef USE_COLOR
						#ifdef USE_LINE_COLOR_ALPHA
							diffuseColor *= vLineColor;
						#else
							diffuseColor.rgb *= vLineColor;
						#endif
					#endif

					#include <logdepthbuf_fragment>

					gl_FragColor = diffuseColor;

					#include <tonemapping_fragment>
					#include <${h.r>=154?"colorspace_fragment":"encodings_fragment"}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(e){this.uniforms.diffuse.value=e}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(e){!0===e?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(e){this.uniforms.linewidth.value=e}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(e){!!e!="USE_DASH"in this.defines&&(this.needsUpdate=!0),!0===e?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(e){this.uniforms.dashScale.value=e}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(e){this.uniforms.dashSize.value=e}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(e){this.uniforms.dashOffset.value=e}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(e){this.uniforms.gapSize.value=e}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(e){this.uniforms.opacity.value=e}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(e){this.uniforms.resolution.value.copy(e)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(e){!!e!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),!0===e?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}}let m=h.r>=125?"uv1":"uv2",p=new s.IUQ,x=new s.Pq0,g=new s.Pq0,y=new s.IUQ,w=new s.IUQ,S=new s.IUQ,b=new s.Pq0,_=new s.kn4,U=new s.cZY,D=new s.Pq0,E=new s.NRn,M=new s.iyt,T=new s.IUQ;function B(e,t,r){return T.set(0,0,-t,1).applyMatrix4(e.projectionMatrix),T.multiplyScalar(1/T.w),T.x=i/r.width,T.y=i/r.height,T.applyMatrix4(e.projectionMatrixInverse),T.multiplyScalar(1/T.w),Math.abs(Math.max(T.x,T.y))}class z extends s.eaF{constructor(e=new d,t=new v({color:0xffffff*Math.random()})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,r=e.attributes.instanceEnd,n=new Float32Array(2*t.count);for(let e=0,i=0,o=t.count;e<o;e++,i+=2)x.fromBufferAttribute(t,e),g.fromBufferAttribute(r,e),n[i]=0===i?0:n[i-1],n[i+1]=n[i]+x.distanceTo(g);let i=new s.LuO(n,2,1);return e.setAttribute("instanceDistanceStart",new s.eHs(i,1,0)),e.setAttribute("instanceDistanceEnd",new s.eHs(i,1,1)),this}raycast(e,t){let r,o,a=this.material.worldUnits,l=e.camera;null!==l||a||console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');let u=void 0!==e.params.Line2&&e.params.Line2.threshold||0;n=e.ray;let c=this.matrixWorld,d=this.geometry,f=this.material;if(i=f.linewidth+u,null===d.boundingSphere&&d.computeBoundingSphere(),M.copy(d.boundingSphere).applyMatrix4(c),a)r=.5*i;else{let e=Math.max(l.near,M.distanceToPoint(n.origin));r=B(l,e,f.resolution)}if(M.radius+=r,!1!==n.intersectsSphere(M)){if(null===d.boundingBox&&d.computeBoundingBox(),E.copy(d.boundingBox).applyMatrix4(c),a)o=.5*i;else{let e=Math.max(l.near,E.distanceToPoint(n.origin));o=B(l,e,f.resolution)}E.expandByScalar(o),!1!==n.intersectsBox(E)&&(a?function(e,t){let r=e.matrixWorld,o=e.geometry,a=o.attributes.instanceStart,l=o.attributes.instanceEnd,u=Math.min(o.instanceCount,a.count);for(let o=0;o<u;o++){U.start.fromBufferAttribute(a,o),U.end.fromBufferAttribute(l,o),U.applyMatrix4(r);let u=new s.Pq0,c=new s.Pq0;n.distanceSqToSegment(U.start,U.end,c,u),c.distanceTo(u)<.5*i&&t.push({point:c,pointOnLine:u,distance:n.origin.distanceTo(c),object:e,face:null,faceIndex:o,uv:null,[m]:null})}}(this,t):function(e,t,r){let o=t.projectionMatrix,a=e.material.resolution,l=e.matrixWorld,u=e.geometry,c=u.attributes.instanceStart,d=u.attributes.instanceEnd,f=Math.min(u.instanceCount,c.count),h=-t.near;n.at(1,S),S.w=1,S.applyMatrix4(t.matrixWorldInverse),S.applyMatrix4(o),S.multiplyScalar(1/S.w),S.x*=a.x/2,S.y*=a.y/2,S.z=0,b.copy(S),_.multiplyMatrices(t.matrixWorldInverse,l);for(let t=0;t<f;t++){if(y.fromBufferAttribute(c,t),w.fromBufferAttribute(d,t),y.w=1,w.w=1,y.applyMatrix4(_),w.applyMatrix4(_),y.z>h&&w.z>h)continue;if(y.z>h){let e=y.z-w.z,t=(y.z-h)/e;y.lerp(w,t)}else if(w.z>h){let e=w.z-y.z,t=(w.z-h)/e;w.lerp(y,t)}y.applyMatrix4(o),w.applyMatrix4(o),y.multiplyScalar(1/y.w),w.multiplyScalar(1/w.w),y.x*=a.x/2,y.y*=a.y/2,w.x*=a.x/2,w.y*=a.y/2,U.start.copy(y),U.start.z=0,U.end.copy(w),U.end.z=0;let u=U.closestPointToPointParameter(b,!0);U.at(u,D);let f=s.cj9.lerp(y.z,w.z,u),v=f>=-1&&f<=1,p=b.distanceTo(D)<.5*i;if(v&&p){U.start.fromBufferAttribute(c,t),U.end.fromBufferAttribute(d,t),U.start.applyMatrix4(l),U.end.applyMatrix4(l);let i=new s.Pq0,o=new s.Pq0;n.distanceSqToSegment(U.start,U.end,o,i),r.push({point:o,pointOnLine:i,distance:n.origin.distanceTo(o),object:e,face:null,faceIndex:t,uv:null,[m]:null})}}}(this,l,t))}}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(p),this.material.uniforms.resolution.value.set(p.z,p.w))}}class A extends d{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){let t=e.length-3,r=new Float32Array(2*t);for(let n=0;n<t;n+=3)r[2*n]=e[n],r[2*n+1]=e[n+1],r[2*n+2]=e[n+2],r[2*n+3]=e[n+3],r[2*n+4]=e[n+4],r[2*n+5]=e[n+5];return super.setPositions(r),this}setColors(e,t=3){let r=e.length-t,n=new Float32Array(2*r);if(3===t)for(let i=0;i<r;i+=t)n[2*i]=e[i],n[2*i+1]=e[i+1],n[2*i+2]=e[i+2],n[2*i+3]=e[i+3],n[2*i+4]=e[i+4],n[2*i+5]=e[i+5];else for(let i=0;i<r;i+=t)n[2*i]=e[i],n[2*i+1]=e[i+1],n[2*i+2]=e[i+2],n[2*i+3]=e[i+3],n[2*i+4]=e[i+4],n[2*i+5]=e[i+5],n[2*i+6]=e[i+6],n[2*i+7]=e[i+7];return super.setColors(n,t),this}fromLine(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}}class P extends z{constructor(e=new A,t=new v({color:0xffffff*Math.random()})){super(e,t),this.isLine2=!0,this.type="Line2"}}let C=a.forwardRef(function({points:e,color:t=0xffffff,vertexColors:r,linewidth:n,lineWidth:i,segments:u,dashed:c,...f},h){var m,p;let x=(0,l.C)(e=>e.size),g=a.useMemo(()=>u?new z:new P,[u]),[y]=a.useState(()=>new v),w=(null==r||null==(m=r[0])?void 0:m.length)===4?4:3,S=a.useMemo(()=>{let n=u?new d:new A,i=e.map(e=>{let t=Array.isArray(e);return e instanceof s.Pq0||e instanceof s.IUQ?[e.x,e.y,e.z]:e instanceof s.I9Y?[e.x,e.y,0]:t&&3===e.length?[e[0],e[1],e[2]]:t&&2===e.length?[e[0],e[1],0]:e});if(n.setPositions(i.flat()),r){t=0xffffff;let e=r.map(e=>e instanceof s.Q1f?e.toArray():e);n.setColors(e.flat(),w)}return n},[e,u,r,w]);return a.useLayoutEffect(()=>{g.computeLineDistances()},[e,g]),a.useLayoutEffect(()=>{c?y.defines.USE_DASH="":delete y.defines.USE_DASH,y.needsUpdate=!0},[c,y]),a.useEffect(()=>()=>{S.dispose(),y.dispose()},[S]),a.createElement("primitive",(0,o.A)({object:g,ref:h},f),a.createElement("primitive",{object:S,attach:"geometry"}),a.createElement("primitive",(0,o.A)({object:y,attach:"material",color:t,vertexColors:!!r,resolution:[x.width,x.height],linewidth:null!=(p=null!=n?n:i)?p:1,dashed:c,transparent:4===w},f)))}),L=a.forwardRef(({threshold:e=15,geometry:t,...r},n)=>{let i=a.useRef(null);a.useImperativeHandle(n,()=>i.current,[]);let l=a.useMemo(()=>[0,0,0,1,0,0],[]),u=a.useRef(null),c=a.useRef(null);return a.useLayoutEffect(()=>{let r=i.current.parent,n=null!=t?t:null==r?void 0:r.geometry;if(!n||u.current===n&&c.current===e)return;u.current=n,c.current=e;let o=new s.TDQ(n,e).attributes.position.array;i.current.geometry.setPositions(o),i.current.geometry.attributes.instanceStart.needsUpdate=!0,i.current.geometry.attributes.instanceEnd.needsUpdate=!0,i.current.computeLineDistances()}),a.createElement(C,(0,o.A)({segments:!0,points:l,ref:i,raycast:()=>null},r))})},43646:(e,t,r)=>{let n,i;r.d(t,{E:()=>y});var o=r(88945),a=r(12115),s=r(12669),l=r(85339),u=r(60099);let c=new l.Pq0,d=new l.Pq0,f=new l.Pq0,h=new l.I9Y;function v(e,t,r){let n=c.setFromMatrixPosition(e.matrixWorld);n.project(t);let i=r.width/2,o=r.height/2;return[n.x*i+i,-(n.y*o)+o]}let m=e=>1e-10>Math.abs(e)?0:e;function p(e,t,r=""){let n="matrix3d(";for(let r=0;16!==r;r++)n+=m(t[r]*e.elements[r])+(15!==r?",":")");return r+n}let x=(n=[1,-1,1,1,1,-1,1,1,1,-1,1,1,1,-1,1,1],e=>p(e,n)),g=(i=e=>[1/e,1/e,1/e,1,-1/e,-1/e,-1/e,-1,1/e,1/e,1/e,1,1,1,1,1],(e,t)=>p(e,i(t),"translate(-50%,-50%)")),y=a.forwardRef(({children:e,eps:t=.001,style:r,className:n,prepend:i,center:p,fullscreen:y,portal:w,distanceFactor:S,sprite:b=!1,transform:_=!1,occlude:U,onOcclude:D,castShadow:E,receiveShadow:M,material:T,geometry:B,zIndexRange:z=[0x1000037,0],calculatePosition:A=v,as:P="div",wrapperClass:C,pointerEvents:L="auto",...R},O)=>{let{gl:F,camera:I,scene:H,size:j,raycaster:W,events:k,viewport:N}=(0,u.C)(),[q]=a.useState(()=>document.createElement(P)),$=a.useRef(null),V=a.useRef(null),G=a.useRef(0),Y=a.useRef([0,0]),Q=a.useRef(null),Z=a.useRef(null),X=(null==w?void 0:w.current)||k.connected||F.domElement.parentNode,K=a.useRef(null),J=a.useRef(!1),ee=a.useMemo(()=>U&&"blending"!==U||Array.isArray(U)&&U.length&&function(e){return e&&"object"==typeof e&&"current"in e}(U[0]),[U]);a.useLayoutEffect(()=>{let e=F.domElement;U&&"blending"===U?(e.style.zIndex=`${Math.floor(z[0]/2)}`,e.style.position="absolute",e.style.pointerEvents="none"):(e.style.zIndex=null,e.style.position=null,e.style.pointerEvents=null)},[U]),a.useLayoutEffect(()=>{if(V.current){let e=$.current=s.createRoot(q);if(H.updateMatrixWorld(),_)q.style.cssText="position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;";else{let e=A(V.current,I,j);q.style.cssText=`position:absolute;top:0;left:0;transform:translate3d(${e[0]}px,${e[1]}px,0);transform-origin:0 0;`}return X&&(i?X.prepend(q):X.appendChild(q)),()=>{X&&X.removeChild(q),e.unmount()}}},[X,_]),a.useLayoutEffect(()=>{C&&(q.className=C)},[C]);let et=a.useMemo(()=>_?{position:"absolute",top:0,left:0,width:j.width,height:j.height,transformStyle:"preserve-3d",pointerEvents:"none"}:{position:"absolute",transform:p?"translate3d(-50%,-50%,0)":"none",...y&&{top:-j.height/2,left:-j.width/2,width:j.width,height:j.height},...r},[r,p,y,j,_]),er=a.useMemo(()=>({position:"absolute",pointerEvents:L}),[L]);a.useLayoutEffect(()=>{var t,i;J.current=!1,_?null==(t=$.current)||t.render(a.createElement("div",{ref:Q,style:et},a.createElement("div",{ref:Z,style:er},a.createElement("div",{ref:O,className:n,style:r,children:e})))):null==(i=$.current)||i.render(a.createElement("div",{ref:O,style:et,className:n,children:e}))});let en=a.useRef(!0);(0,u.D)(e=>{if(V.current){I.updateMatrixWorld(),V.current.updateWorldMatrix(!0,!1);let e=_?Y.current:A(V.current,I,j);if(_||Math.abs(G.current-I.zoom)>t||Math.abs(Y.current[0]-e[0])>t||Math.abs(Y.current[1]-e[1])>t){let t=function(e,t){let r=c.setFromMatrixPosition(e.matrixWorld),n=d.setFromMatrixPosition(t.matrixWorld),i=r.sub(n),o=t.getWorldDirection(f);return i.angleTo(o)>Math.PI/2}(V.current,I),r=!1;ee&&(Array.isArray(U)?r=U.map(e=>e.current):"blending"!==U&&(r=[H]));let n=en.current;r?en.current=function(e,t,r,n){let i=c.setFromMatrixPosition(e.matrixWorld),o=i.clone();o.project(t),h.set(o.x,o.y),r.setFromCamera(h,t);let a=r.intersectObjects(n,!0);if(a.length){let e=a[0].distance;return i.distanceTo(r.ray.origin)<e}return!0}(V.current,I,W,r)&&!t:en.current=!t,n!==en.current&&(D?D(!en.current):q.style.display=en.current?"block":"none");let i=Math.floor(z[0]/2),o=U?ee?[z[0],i]:[i-1,0]:z;if(q.style.zIndex=`${function(e,t,r){if(t instanceof l.ubm||t instanceof l.qUd){let n=c.setFromMatrixPosition(e.matrixWorld),i=d.setFromMatrixPosition(t.matrixWorld),o=n.distanceTo(i),a=(r[1]-r[0])/(t.far-t.near),s=r[1]-a*t.far;return Math.round(a*o+s)}}(V.current,I,o)}`,_){let[e,t]=[j.width/2,j.height/2],r=I.projectionMatrix.elements[5]*t,{isOrthographicCamera:n,top:i,left:o,bottom:a,right:s}=I,l=x(I.matrixWorldInverse),u=n?`scale(${r})translate(${m(-(s+o)/2)}px,${m((i+a)/2)}px)`:`translateZ(${r}px)`,c=V.current.matrixWorld;b&&((c=I.matrixWorldInverse.clone().transpose().copyPosition(c).scale(V.current.scale)).elements[3]=c.elements[7]=c.elements[11]=0,c.elements[15]=1),q.style.width=j.width+"px",q.style.height=j.height+"px",q.style.perspective=n?"":`${r}px`,Q.current&&Z.current&&(Q.current.style.transform=`${u}${l}translate(${e}px,${t}px)`,Z.current.style.transform=g(c,1/((S||10)/400)))}else{let t=void 0===S?1:function(e,t){if(t instanceof l.qUd)return t.zoom;if(!(t instanceof l.ubm))return 1;{let r=c.setFromMatrixPosition(e.matrixWorld),n=d.setFromMatrixPosition(t.matrixWorld);return 1/(2*Math.tan(t.fov*Math.PI/180/2)*r.distanceTo(n))}}(V.current,I)*S;q.style.transform=`translate3d(${e[0]}px,${e[1]}px,0) scale(${t})`}Y.current=e,G.current=I.zoom}}if(!ee&&K.current&&!J.current)if(_){if(Q.current){let e=Q.current.children[0];if(null!=e&&e.clientWidth&&null!=e&&e.clientHeight){let{isOrthographicCamera:t}=I;if(t||B)R.scale&&(Array.isArray(R.scale)?R.scale instanceof l.Pq0?K.current.scale.copy(R.scale.clone().divideScalar(1)):K.current.scale.set(1/R.scale[0],1/R.scale[1],1/R.scale[2]):K.current.scale.setScalar(1/R.scale));else{let t=(S||10)/400,r=e.clientWidth*t,n=e.clientHeight*t;K.current.scale.set(r,n,1)}J.current=!0}}}else{let t=q.children[0];if(null!=t&&t.clientWidth&&null!=t&&t.clientHeight){let e=1/N.factor,r=t.clientWidth*e,n=t.clientHeight*e;K.current.scale.set(r,n,1),J.current=!0}K.current.lookAt(e.camera.position)}});let ei=a.useMemo(()=>({vertexShader:_?void 0:`
          /*
            This shader is from the THREE's SpriteMaterial.
            We need to turn the backing plane into a Sprite
            (make it always face the camera) if "transfrom"
            is false.
          */
          #include <common>

          void main() {
            vec2 center = vec2(0., 1.);
            float rotation = 0.0;

            // This is somewhat arbitrary, but it seems to work well
            // Need to figure out how to derive this dynamically if it even matters
            float size = 0.03;

            vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
            vec2 scale;
            scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
            scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );

            bool isPerspective = isPerspectiveMatrix( projectionMatrix );
            if ( isPerspective ) scale *= - mvPosition.z;

            vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale * size;
            vec2 rotatedPosition;
            rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
            rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
            mvPosition.xy += rotatedPosition;

            gl_Position = projectionMatrix * mvPosition;
          }
      `,fragmentShader:`
        void main() {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        }
      `}),[_]);return a.createElement("group",(0,o.A)({},R,{ref:V}),U&&!ee&&a.createElement("mesh",{castShadow:E,receiveShadow:M,ref:K},B||a.createElement("planeGeometry",null),T||a.createElement("shaderMaterial",{side:l.$EB,vertexShader:ei.vertexShader,fragmentShader:ei.fragmentShader})))})}}]);