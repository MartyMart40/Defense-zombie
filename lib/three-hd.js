/* Haute définition : morceaux de Three.js r128 (examples/js), réunis en un fichier : fflate 0.6.9 (pour les images EXR), EXRLoader, SimplexNoise, SSAOShader, SSAOPass. Source : github.com/mrdoob/three.js/tree/r128/examples/js (licence MIT). Chargé seulement quand le style Haute définition est choisi (js/57-graphismes.js). Ne pas modifier. */

;/* ---- libs/fflate.min.js ---- */
/*!
fflate - fast JavaScript compression/decompression
<https://101arrowz.github.io/fflate>
Licensed under MIT. https://github.com/101arrowz/fflate/blob/master/LICENSE
version 0.6.9
*/
!function(f){typeof module!='undefined'&&typeof exports=='object'?module.exports=f():typeof define!='undefined'&&define.amd?define(['fflate',f]):(typeof self!='undefined'?self:this).fflate=f()}(function(){var _e={};"use strict";var t=(typeof module!='undefined'&&typeof exports=='object'?function(_f){"use strict";var e,t=";var __w=require('worker_threads');__w.parentPort.on('message',function(m){onmessage({data:m})}),postMessage=function(m,t){__w.parentPort.postMessage(m,t)},close=process.exit;self=global";try{e=require("worker_threads").Worker}catch(e){}exports.default=e?function(r,n,o,a,s){var u=!1,i=new e(r+t,{eval:!0}).on("error",(function(e){return s(e,null)})).on("message",(function(e){return s(null,e)})).on("exit",(function(e){e&&!u&&s(Error("exited with code "+e),null)}));return i.postMessage(o,a),i.terminate=function(){return u=!0,e.prototype.terminate.call(i)},i}:function(e,t,r,n,o){setImmediate((function(){return o(Error("async operations unsupported - update to Node 12+ (or Node 10-11 with the --experimental-worker CLI flag)"),null)}));var a=function(){};return{terminate:a,postMessage:a}};return _f}:function(_f){"use strict";var e={},r=function(e){return URL.createObjectURL(new Blob([e],{type:"text/javascript"}))},t=function(e){return new Worker(e)};try{URL.revokeObjectURL(r(""))}catch(e){r=function(e){return"data:application/javascript;charset=UTF-8,"+encodeURI(e)},t=function(e){return new Worker(e,{type:"module"})}}_f.default=function(n,o,u,a,c){var i=t(e[o]||(e[o]=r(n)));return i.onerror=function(e){return c(e.error,null)},i.onmessage=function(e){return c(null,e.data)},i.postMessage(u,a),i};return _f})({}),n=Uint8Array,r=Uint16Array,e=Uint32Array,i=new n([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),o=new n([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),a=new n([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),s=function(t,n){for(var i=new r(31),o=0;o<31;++o)i[o]=n+=1<<t[o-1];var a=new e(i[30]);for(o=1;o<30;++o)for(var s=i[o];s<i[o+1];++s)a[s]=s-i[o]<<5|o;return[i,a]},f=s(i,2),u=f[0],h=f[1];u[28]=258,h[258]=28;for(var c=s(o,0),l=c[0],p=c[1],v=new r(32768),d=0;d<32768;++d){var g=(43690&d)>>>1|(21845&d)<<1;v[d]=((65280&(g=(61680&(g=(52428&g)>>>2|(13107&g)<<2))>>>4|(3855&g)<<4))>>>8|(255&g)<<8)>>>1}var w=function(t,n,e){for(var i=t.length,o=0,a=new r(n);o<i;++o)++a[t[o]-1];var s,f=new r(n);for(o=0;o<n;++o)f[o]=f[o-1]+a[o-1]<<1;if(e){s=new r(1<<n);var u=15-n;for(o=0;o<i;++o)if(t[o])for(var h=o<<4|t[o],c=n-t[o],l=f[t[o]-1]++<<c,p=l|(1<<c)-1;l<=p;++l)s[v[l]>>>u]=h}else for(s=new r(i),o=0;o<i;++o)t[o]&&(s[o]=v[f[t[o]-1]++]>>>15-t[o]);return s},y=new n(288);for(d=0;d<144;++d)y[d]=8;for(d=144;d<256;++d)y[d]=9;for(d=256;d<280;++d)y[d]=7;for(d=280;d<288;++d)y[d]=8;var m=new n(32);for(d=0;d<32;++d)m[d]=5;var b=w(y,9,0),x=w(y,9,1),z=w(m,5,0),k=w(m,5,1),M=function(t){for(var n=t[0],r=1;r<t.length;++r)t[r]>n&&(n=t[r]);return n},A=function(t,n,r){var e=n/8|0;return(t[e]|t[e+1]<<8)>>(7&n)&r},S=function(t,n){var r=n/8|0;return(t[r]|t[r+1]<<8|t[r+2]<<16)>>(7&n)},D=function(t){return(t/8|0)+(7&t&&1)},C=function(t,i,o){(null==i||i<0)&&(i=0),(null==o||o>t.length)&&(o=t.length);var a=new(t instanceof r?r:t instanceof e?e:n)(o-i);return a.set(t.subarray(i,o)),a},U=function(t,r,e){var s=t.length;if(!s||e&&!e.l&&s<5)return r||new n(0);var f=!r||e,h=!e||e.i;e||(e={}),r||(r=new n(3*s));var c=function(t){var e=r.length;if(t>e){var i=new n(Math.max(2*e,t));i.set(r),r=i}},p=e.f||0,v=e.p||0,d=e.b||0,g=e.l,y=e.d,m=e.m,b=e.n,z=8*s;do{if(!g){e.f=p=A(t,v,1);var U=A(t,v+1,3);if(v+=3,!U){var O=t[(Y=D(v)+4)-4]|t[Y-3]<<8,T=Y+O;if(T>s){if(h)throw"unexpected EOF";break}f&&c(d+O),r.set(t.subarray(Y,T),d),e.b=d+=O,e.p=v=8*T;continue}if(1==U)g=x,y=k,m=9,b=5;else{if(2!=U)throw"invalid block type";var Z=A(t,v,31)+257,I=A(t,v+10,15)+4,F=Z+A(t,v+5,31)+1;v+=14;for(var E=new n(F),G=new n(19),P=0;P<I;++P)G[a[P]]=A(t,v+3*P,7);v+=3*I;var j=M(G),q=(1<<j)-1,H=w(G,j,1);for(P=0;P<F;){var Y,B=H[A(t,v,q)];if(v+=15&B,(Y=B>>>4)<16)E[P++]=Y;else{var J=0,K=0;for(16==Y?(K=3+A(t,v,3),v+=2,J=E[P-1]):17==Y?(K=3+A(t,v,7),v+=3):18==Y&&(K=11+A(t,v,127),v+=7);K--;)E[P++]=J}}var L=E.subarray(0,Z),N=E.subarray(Z);m=M(L),b=M(N),g=w(L,m,1),y=w(N,b,1)}if(v>z){if(h)throw"unexpected EOF";break}}f&&c(d+131072);for(var Q=(1<<m)-1,R=(1<<b)-1,V=v;;V=v){var W=(J=g[S(t,v)&Q])>>>4;if((v+=15&J)>z){if(h)throw"unexpected EOF";break}if(!J)throw"invalid length/literal";if(W<256)r[d++]=W;else{if(256==W){V=v,g=null;break}var X=W-254;W>264&&(X=A(t,v,(1<<(tt=i[P=W-257]))-1)+u[P],v+=tt);var $=y[S(t,v)&R],_=$>>>4;if(!$)throw"invalid distance";if(v+=15&$,N=l[_],_>3){var tt=o[_];N+=S(t,v)&(1<<tt)-1,v+=tt}if(v>z){if(h)throw"unexpected EOF";break}f&&c(d+131072);for(var nt=d+X;d<nt;d+=4)r[d]=r[d-N],r[d+1]=r[d+1-N],r[d+2]=r[d+2-N],r[d+3]=r[d+3-N];d=nt}}e.l=g,e.p=V,e.b=d,g&&(p=1,e.m=m,e.d=y,e.n=b)}while(!p);return d==r.length?r:C(r,0,d)},O=function(t,n,r){var e=n/8|0;t[e]|=r<<=7&n,t[e+1]|=r>>>8},T=function(t,n,r){var e=n/8|0;t[e]|=r<<=7&n,t[e+1]|=r>>>8,t[e+2]|=r>>>16},Z=function(t,e){for(var i=[],o=0;o<t.length;++o)t[o]&&i.push({s:o,f:t[o]});var a=i.length,s=i.slice();if(!a)return[q,0];if(1==a){var f=new n(i[0].s+1);return f[i[0].s]=1,[f,1]}i.sort((function(t,n){return t.f-n.f})),i.push({s:-1,f:25001});var u=i[0],h=i[1],c=0,l=1,p=2;for(i[0]={s:-1,f:u.f+h.f,l:u,r:h};l!=a-1;)u=i[i[c].f<i[p].f?c++:p++],h=i[c!=l&&i[c].f<i[p].f?c++:p++],i[l++]={s:-1,f:u.f+h.f,l:u,r:h};var v=s[0].s;for(o=1;o<a;++o)s[o].s>v&&(v=s[o].s);var d=new r(v+1),g=I(i[l-1],d,0);if(g>e){o=0;var w=0,y=g-e,m=1<<y;for(s.sort((function(t,n){return d[n.s]-d[t.s]||t.f-n.f}));o<a;++o){var b=s[o].s;if(!(d[b]>e))break;w+=m-(1<<g-d[b]),d[b]=e}for(w>>>=y;w>0;){var x=s[o].s;d[x]<e?w-=1<<e-d[x]++-1:++o}for(;o>=0&&w;--o){var z=s[o].s;d[z]==e&&(--d[z],++w)}g=e}return[new n(d),g]},I=function(t,n,r){return-1==t.s?Math.max(I(t.l,n,r+1),I(t.r,n,r+1)):n[t.s]=r},F=function(t){for(var n=t.length;n&&!t[--n];);for(var e=new r(++n),i=0,o=t[0],a=1,s=function(t){e[i++]=t},f=1;f<=n;++f)if(t[f]==o&&f!=n)++a;else{if(!o&&a>2){for(;a>138;a-=138)s(32754);a>2&&(s(a>10?a-11<<5|28690:a-3<<5|12305),a=0)}else if(a>3){for(s(o),--a;a>6;a-=6)s(8304);a>2&&(s(a-3<<5|8208),a=0)}for(;a--;)s(o);a=1,o=t[f]}return[e.subarray(0,i),n]},E=function(t,n){for(var r=0,e=0;e<n.length;++e)r+=t[e]*n[e];return r},G=function(t,n,r){var e=r.length,i=D(n+2);t[i]=255&e,t[i+1]=e>>>8,t[i+2]=255^t[i],t[i+3]=255^t[i+1];for(var o=0;o<e;++o)t[i+o+4]=r[o];return 8*(i+4+e)},P=function(t,n,e,s,f,u,h,c,l,p,v){O(n,v++,e),++f[256];for(var d=Z(f,15),g=d[0],x=d[1],k=Z(u,15),M=k[0],A=k[1],S=F(g),D=S[0],C=S[1],U=F(M),I=U[0],P=U[1],j=new r(19),q=0;q<D.length;++q)j[31&D[q]]++;for(q=0;q<I.length;++q)j[31&I[q]]++;for(var H=Z(j,7),Y=H[0],B=H[1],J=19;J>4&&!Y[a[J-1]];--J);var K,L,N,Q,R=p+5<<3,V=E(f,y)+E(u,m)+h,W=E(f,g)+E(u,M)+h+14+3*J+E(j,Y)+(2*j[16]+3*j[17]+7*j[18]);if(R<=V&&R<=W)return G(n,v,t.subarray(l,l+p));if(O(n,v,1+(W<V)),v+=2,W<V){K=w(g,x,0),L=g,N=w(M,A,0),Q=M;var X=w(Y,B,0);for(O(n,v,C-257),O(n,v+5,P-1),O(n,v+10,J-4),v+=14,q=0;q<J;++q)O(n,v+3*q,Y[a[q]]);v+=3*J;for(var $=[D,I],_=0;_<2;++_){var tt=$[_];for(q=0;q<tt.length;++q)O(n,v,X[nt=31&tt[q]]),v+=Y[nt],nt>15&&(O(n,v,tt[q]>>>5&127),v+=tt[q]>>>12)}}else K=b,L=y,N=z,Q=m;for(q=0;q<c;++q)if(s[q]>255){var nt;T(n,v,K[257+(nt=s[q]>>>18&31)]),v+=L[nt+257],nt>7&&(O(n,v,s[q]>>>23&31),v+=i[nt]);var rt=31&s[q];T(n,v,N[rt]),v+=Q[rt],rt>3&&(T(n,v,s[q]>>>5&8191),v+=o[rt])}else T(n,v,K[s[q]]),v+=L[s[q]];return T(n,v,K[256]),v+L[256]},j=new e([65540,131080,131088,131104,262176,1048704,1048832,2114560,2117632]),q=new n(0),H=function(t,a,s,f,u,c){var l=t.length,v=new n(f+l+5*(1+Math.ceil(l/7e3))+u),d=v.subarray(f,v.length-u),g=0;if(!a||l<8)for(var w=0;w<=l;w+=65535){var y=w+65535;y<l?g=G(d,g,t.subarray(w,y)):(d[w]=c,g=G(d,g,t.subarray(w,l)))}else{for(var m=j[a-1],b=m>>>13,x=8191&m,z=(1<<s)-1,k=new r(32768),M=new r(z+1),A=Math.ceil(s/3),S=2*A,U=function(n){return(t[n]^t[n+1]<<A^t[n+2]<<S)&z},O=new e(25e3),T=new r(288),Z=new r(32),I=0,F=0,E=(w=0,0),H=0,Y=0;w<l;++w){var B=U(w),J=32767&w,K=M[B];if(k[J]=K,M[B]=J,H<=w){var L=l-w;if((I>7e3||E>24576)&&L>423){g=P(t,d,0,O,T,Z,F,E,Y,w-Y,g),E=I=F=0,Y=w;for(var N=0;N<286;++N)T[N]=0;for(N=0;N<30;++N)Z[N]=0}var Q=2,R=0,V=x,W=J-K&32767;if(L>2&&B==U(w-W))for(var X=Math.min(b,L)-1,$=Math.min(32767,w),_=Math.min(258,L);W<=$&&--V&&J!=K;){if(t[w+Q]==t[w+Q-W]){for(var tt=0;tt<_&&t[w+tt]==t[w+tt-W];++tt);if(tt>Q){if(Q=tt,R=W,tt>X)break;var nt=Math.min(W,tt-2),rt=0;for(N=0;N<nt;++N){var et=w-W+N+32768&32767,it=et-k[et]+32768&32767;it>rt&&(rt=it,K=et)}}}W+=(J=K)-(K=k[J])+32768&32767}if(R){O[E++]=268435456|h[Q]<<18|p[R];var ot=31&h[Q],at=31&p[R];F+=i[ot]+o[at],++T[257+ot],++Z[at],H=w+Q,++I}else O[E++]=t[w],++T[t[w]]}}g=P(t,d,c,O,T,Z,F,E,Y,w-Y,g),!c&&7&g&&(g=G(d,g+1,q))}return C(v,0,f+D(g)+u)},Y=function(){for(var t=new e(256),n=0;n<256;++n){for(var r=n,i=9;--i;)r=(1&r&&3988292384)^r>>>1;t[n]=r}return t}(),B=function(){var t=-1;return{p:function(n){for(var r=t,e=0;e<n.length;++e)r=Y[255&r^n[e]]^r>>>8;t=r},d:function(){return~t}}},J=function(){var t=1,n=0;return{p:function(r){for(var e=t,i=n,o=r.length,a=0;a!=o;){for(var s=Math.min(a+2655,o);a<s;++a)i+=e+=r[a];e=(65535&e)+15*(e>>16),i=(65535&i)+15*(i>>16)}t=e,n=i},d:function(){return(255&(t%=65521))<<24|t>>>8<<16|(255&(n%=65521))<<8|n>>>8}}},K=function(t,n,r,e,i){return H(t,null==n.level?6:n.level,null==n.mem?Math.ceil(1.5*Math.max(8,Math.min(13,Math.log(t.length)))):12+n.mem,r,e,!i)},L=function(t,n){var r={};for(var e in t)r[e]=t[e];for(var e in n)r[e]=n[e];return r},N=function(t,n,r){for(var e=t(),i=""+t,o=i.slice(i.indexOf("[")+1,i.lastIndexOf("]")).replace(/ /g,"").split(","),a=0;a<e.length;++a){var s=e[a],f=o[a];if("function"==typeof s){n+=";"+f+"=";var u=""+s;if(s.prototype)if(-1!=u.indexOf("[native code]")){var h=u.indexOf(" ",8)+1;n+=u.slice(h,u.indexOf("(",h))}else for(var c in n+=u,s.prototype)n+=";"+f+".prototype."+c+"="+s.prototype[c];else n+=u}else r[f]=s}return[n,r]},Q=[],R=function(t){var i=[];for(var o in t)(t[o]instanceof n||t[o]instanceof r||t[o]instanceof e)&&i.push((t[o]=new t[o].constructor(t[o])).buffer);return i},V=function(n,r,e,i){var o;if(!Q[e]){for(var a="",s={},f=n.length-1,u=0;u<f;++u)a=(o=N(n[u],a,s))[0],s=o[1];Q[e]=N(n[f],a,s)}var h=L({},Q[e][1]);return t.default(Q[e][0]+";onmessage=function(e){for(var k in e.data)self[k]=e.data[k];onmessage="+r+"}",e,h,R(h),i)},W=function(){return[n,r,e,i,o,a,u,l,x,k,v,w,M,A,S,D,C,U,At,rt,et]},X=function(){return[n,r,e,i,o,a,h,p,b,y,z,m,v,j,q,w,O,T,Z,I,F,E,G,P,D,C,H,K,xt,rt]},$=function(){return[ct,vt,ht,B,Y]},_=function(){return[lt,pt]},tt=function(){return[dt,ht,J]},nt=function(){return[gt]},rt=function(t){return postMessage(t,[t.buffer])},et=function(t){return t&&t.size&&new n(t.size)},it=function(t,n,r,e,i,o){var a=V(r,e,i,(function(t,n){a.terminate(),o(t,n)}));return a.postMessage([t,n],n.consume?[t.buffer]:[]),function(){a.terminate()}},ot=function(t){return t.ondata=function(t,n){return postMessage([t,n],[t.buffer])},function(n){return t.push(n.data[0],n.data[1])}},at=function(t,n,r,e,i){var o,a=V(t,e,i,(function(t,r){t?(a.terminate(),n.ondata.call(n,t)):(r[1]&&a.terminate(),n.ondata.call(n,t,r[0],r[1]))}));a.postMessage(r),n.push=function(t,r){if(o)throw"stream finished";if(!n.ondata)throw"no stream handler";a.postMessage([t,o=r],[t.buffer])},n.terminate=function(){a.terminate()}},st=function(t,n){return t[n]|t[n+1]<<8},ft=function(t,n){return(t[n]|t[n+1]<<8|t[n+2]<<16|t[n+3]<<24)>>>0},ut=function(t,n){return ft(t,n)+4294967296*ft(t,n+4)},ht=function(t,n,r){for(;r;++n)t[n]=r,r>>>=8},ct=function(t,n){var r=n.filename;if(t[0]=31,t[1]=139,t[2]=8,t[8]=n.level<2?4:9==n.level?2:0,t[9]=3,0!=n.mtime&&ht(t,4,Math.floor(new Date(n.mtime||Date.now())/1e3)),r){t[3]=8;for(var e=0;e<=r.length;++e)t[e+10]=r.charCodeAt(e)}},lt=function(t){if(31!=t[0]||139!=t[1]||8!=t[2])throw"invalid gzip data";var n=t[3],r=10;4&n&&(r+=t[10]|2+(t[11]<<8));for(var e=(n>>3&1)+(n>>4&1);e>0;e-=!t[r++]);return r+(2&n)},pt=function(t){var n=t.length;return(t[n-4]|t[n-3]<<8|t[n-2]<<16|t[n-1]<<24)>>>0},vt=function(t){return 10+(t.filename&&t.filename.length+1||0)},dt=function(t,n){var r=n.level,e=0==r?0:r<6?1:9==r?3:2;t[0]=120,t[1]=e<<6|(e?32-2*e:1)},gt=function(t){if(8!=(15&t[0])||t[0]>>>4>7||(t[0]<<8|t[1])%31)throw"invalid zlib data";if(32&t[1])throw"invalid zlib data: preset dictionaries not supported"};function wt(t,n){return n||"function"!=typeof t||(n=t,t={}),this.ondata=n,t}var yt=function(){function t(t,n){n||"function"!=typeof t||(n=t,t={}),this.ondata=n,this.o=t||{}}return t.prototype.p=function(t,n){this.ondata(K(t,this.o,0,0,!n),n)},t.prototype.push=function(t,n){if(this.d)throw"stream finished";if(!this.ondata)throw"no stream handler";this.d=n,this.p(t,n||!1)},t}();_e.Deflate=yt;var mt=function(){return function(t,n){at([X,function(){return[ot,yt]}],this,wt.call(this,t,n),(function(t){var n=new yt(t.data);onmessage=ot(n)}),6)}}();function bt(t,n,r){if(r||(r=n,n={}),"function"!=typeof r)throw"no callback";return it(t,n,[X],(function(t){return rt(xt(t.data[0],t.data[1]))}),0,r)}function xt(t,n){return K(t,n||{},0,0)}_e.AsyncDeflate=mt,_e.deflate=bt,_e.deflateSync=xt;var zt=function(){function t(t){this.s={},this.p=new n(0),this.ondata=t}return t.prototype.e=function(t){if(this.d)throw"stream finished";if(!this.ondata)throw"no stream handler";var r=this.p.length,e=new n(r+t.length);e.set(this.p),e.set(t,r),this.p=e},t.prototype.c=function(t){this.d=this.s.i=t||!1;var n=this.s.b,r=U(this.p,this.o,this.s);this.ondata(C(r,n,this.s.b),this.d),this.o=C(r,this.s.b-32768),this.s.b=this.o.length,this.p=C(this.p,this.s.p/8|0),this.s.p&=7},t.prototype.push=function(t,n){this.e(t),this.c(n)},t}();_e.Inflate=zt;var kt=function(){return function(t){this.ondata=t,at([W,function(){return[ot,zt]}],this,0,(function(){var t=new zt;onmessage=ot(t)}),7)}}();function Mt(t,n,r){if(r||(r=n,n={}),"function"!=typeof r)throw"no callback";return it(t,n,[W],(function(t){return rt(At(t.data[0],et(t.data[1])))}),1,r)}function At(t,n){return U(t,n)}_e.AsyncInflate=kt,_e.inflate=Mt,_e.inflateSync=At;var St=function(){function t(t,n){this.c=B(),this.l=0,this.v=1,yt.call(this,t,n)}return t.prototype.push=function(t,n){yt.prototype.push.call(this,t,n)},t.prototype.p=function(t,n){this.c.p(t),this.l+=t.length;var r=K(t,this.o,this.v&&vt(this.o),n&&8,!n);this.v&&(ct(r,this.o),this.v=0),n&&(ht(r,r.length-8,this.c.d()),ht(r,r.length-4,this.l)),this.ondata(r,n)},t}();_e.Gzip=St,_e.Compress=St;var Dt=function(){return function(t,n){at([X,$,function(){return[ot,yt,St]}],this,wt.call(this,t,n),(function(t){var n=new St(t.data);onmessage=ot(n)}),8)}}();function Ct(t,n,r){if(r||(r=n,n={}),"function"!=typeof r)throw"no callback";return it(t,n,[X,$,function(){return[Ut]}],(function(t){return rt(Ut(t.data[0],t.data[1]))}),2,r)}function Ut(t,n){n||(n={});var r=B(),e=t.length;r.p(t);var i=K(t,n,vt(n),8),o=i.length;return ct(i,n),ht(i,o-8,r.d()),ht(i,o-4,e),i}_e.AsyncGzip=Dt,_e.AsyncCompress=Dt,_e.gzip=Ct,_e.compress=Ct,_e.gzipSync=Ut,_e.compressSync=Ut;var Ot=function(){function t(t){this.v=1,zt.call(this,t)}return t.prototype.push=function(t,n){if(zt.prototype.e.call(this,t),this.v){var r=this.p.length>3?lt(this.p):4;if(r>=this.p.length&&!n)return;this.p=this.p.subarray(r),this.v=0}if(n){if(this.p.length<8)throw"invalid gzip stream";this.p=this.p.subarray(0,-8)}zt.prototype.c.call(this,n)},t}();_e.Gunzip=Ot;var Tt=function(){return function(t){this.ondata=t,at([W,_,function(){return[ot,zt,Ot]}],this,0,(function(){var t=new Ot;onmessage=ot(t)}),9)}}();function Zt(t,n,r){if(r||(r=n,n={}),"function"!=typeof r)throw"no callback";return it(t,n,[W,_,function(){return[It]}],(function(t){return rt(It(t.data[0]))}),3,r)}function It(t,r){return U(t.subarray(lt(t),-8),r||new n(pt(t)))}_e.AsyncGunzip=Tt,_e.gunzip=Zt,_e.gunzipSync=It;var Ft=function(){function t(t,n){this.c=J(),this.v=1,yt.call(this,t,n)}return t.prototype.push=function(t,n){yt.prototype.push.call(this,t,n)},t.prototype.p=function(t,n){this.c.p(t);var r=K(t,this.o,this.v&&2,n&&4,!n);this.v&&(dt(r,this.o),this.v=0),n&&ht(r,r.length-4,this.c.d()),this.ondata(r,n)},t}();_e.Zlib=Ft;var Et=function(){return function(t,n){at([X,tt,function(){return[ot,yt,Ft]}],this,wt.call(this,t,n),(function(t){var n=new Ft(t.data);onmessage=ot(n)}),10)}}();function Gt(t,n,r){if(r||(r=n,n={}),"function"!=typeof r)throw"no callback";return it(t,n,[X,tt,function(){return[Pt]}],(function(t){return rt(Pt(t.data[0],t.data[1]))}),4,r)}function Pt(t,n){n||(n={});var r=J();r.p(t);var e=K(t,n,2,4);return dt(e,n),ht(e,e.length-4,r.d()),e}_e.AsyncZlib=Et,_e.zlib=Gt,_e.zlibSync=Pt;var jt=function(){function t(t){this.v=1,zt.call(this,t)}return t.prototype.push=function(t,n){if(zt.prototype.e.call(this,t),this.v){if(this.p.length<2&&!n)return;this.p=this.p.subarray(2),this.v=0}if(n){if(this.p.length<4)throw"invalid zlib stream";this.p=this.p.subarray(0,-4)}zt.prototype.c.call(this,n)},t}();_e.Unzlib=jt;var qt=function(){return function(t){this.ondata=t,at([W,nt,function(){return[ot,zt,jt]}],this,0,(function(){var t=new jt;onmessage=ot(t)}),11)}}();function Ht(t,n,r){if(r||(r=n,n={}),"function"!=typeof r)throw"no callback";return it(t,n,[W,nt,function(){return[Yt]}],(function(t){return rt(Yt(t.data[0],et(t.data[1])))}),5,r)}function Yt(t,n){return U((gt(t),t.subarray(2,-4)),n)}_e.AsyncUnzlib=qt,_e.unzlib=Ht,_e.unzlibSync=Yt;var Bt=function(){function t(t){this.G=Ot,this.I=zt,this.Z=jt,this.ondata=t}return t.prototype.push=function(t,r){if(!this.ondata)throw"no stream handler";if(this.s)this.s.push(t,r);else{if(this.p&&this.p.length){var e=new n(this.p.length+t.length);e.set(this.p),e.set(t,this.p.length)}else this.p=t;if(this.p.length>2){var i=this,o=function(){i.ondata.apply(i,arguments)};this.s=31==this.p[0]&&139==this.p[1]&&8==this.p[2]?new this.G(o):8!=(15&this.p[0])||this.p[0]>>4>7||(this.p[0]<<8|this.p[1])%31?new this.I(o):new this.Z(o),this.s.push(this.p,r),this.p=null}}},t}();_e.Decompress=Bt;var Jt=function(){function t(t){this.G=Tt,this.I=kt,this.Z=qt,this.ondata=t}return t.prototype.push=function(t,n){Bt.prototype.push.call(this,t,n)},t}();function Kt(t,n,r){if(r||(r=n,n={}),"function"!=typeof r)throw"no callback";return 31==t[0]&&139==t[1]&&8==t[2]?Zt(t,n,r):8!=(15&t[0])||t[0]>>4>7||(t[0]<<8|t[1])%31?Mt(t,n,r):Ht(t,n,r)}function Lt(t,n){return 31==t[0]&&139==t[1]&&8==t[2]?It(t,n):8!=(15&t[0])||t[0]>>4>7||(t[0]<<8|t[1])%31?At(t,n):Yt(t,n)}_e.AsyncDecompress=Jt,_e.decompress=Kt,_e.decompressSync=Lt;var Nt=function(t,r,e,i){for(var o in t){var a=t[o],s=r+o;a instanceof n?e[s]=[a,i]:Array.isArray(a)?e[s]=[a[0],L(i,a[1])]:Nt(a,s+"/",e,i)}},Qt="undefined"!=typeof TextEncoder&&new TextEncoder,Rt="undefined"!=typeof TextDecoder&&new TextDecoder,Vt=0;try{Rt.decode(q,{stream:!0}),Vt=1}catch(t){}var Wt=function(t){for(var n="",r=0;;){var e=t[r++],i=(e>127)+(e>223)+(e>239);if(r+i>t.length)return[n,C(t,r-1)];i?3==i?(e=((15&e)<<18|(63&t[r++])<<12|(63&t[r++])<<6|63&t[r++])-65536,n+=String.fromCharCode(55296|e>>10,56320|1023&e)):n+=String.fromCharCode(1&i?(31&e)<<6|63&t[r++]:(15&e)<<12|(63&t[r++])<<6|63&t[r++]):n+=String.fromCharCode(e)}},Xt=function(){function t(t){this.ondata=t,Vt?this.t=new TextDecoder:this.p=q}return t.prototype.push=function(t,r){if(!this.ondata)throw"no callback";if(r=!!r,this.t){if(this.ondata(this.t.decode(t,{stream:!0}),r),r){if(this.t.decode().length)throw"invalid utf-8 data";this.t=null}}else{if(!this.p)throw"stream finished";var e=new n(this.p.length+t.length);e.set(this.p),e.set(t,this.p.length);var i=Wt(e),o=i[0],a=i[1];if(r){if(a.length)throw"invalid utf-8 data";this.p=null}else this.p=a;this.ondata(o,r)}},t}();_e.DecodeUTF8=Xt;var $t=function(){function t(t){this.ondata=t}return t.prototype.push=function(t,n){if(!this.ondata)throw"no callback";if(this.d)throw"stream finished";this.ondata(_t(t),this.d=n||!1)},t}();function _t(t,r){if(r){for(var e=new n(t.length),i=0;i<t.length;++i)e[i]=t.charCodeAt(i);return e}if(Qt)return Qt.encode(t);var o=t.length,a=new n(t.length+(t.length>>1)),s=0,f=function(t){a[s++]=t};for(i=0;i<o;++i){if(s+5>a.length){var u=new n(s+8+(o-i<<1));u.set(a),a=u}var h=t.charCodeAt(i);h<128||r?f(h):h<2048?(f(192|h>>6),f(128|63&h)):h>55295&&h<57344?(f(240|(h=65536+(1047552&h)|1023&t.charCodeAt(++i))>>18),f(128|h>>12&63),f(128|h>>6&63),f(128|63&h)):(f(224|h>>12),f(128|h>>6&63),f(128|63&h))}return C(a,0,s)}function tn(t,n){if(n){for(var r="",e=0;e<t.length;e+=16384)r+=String.fromCharCode.apply(null,t.subarray(e,e+16384));return r}if(Rt)return Rt.decode(t);var i=Wt(t);if(i[1].length)throw"invalid utf-8 data";return i[0]}_e.EncodeUTF8=$t,_e.strToU8=_t,_e.strFromU8=tn;var nn=function(t){return 1==t?3:t<6?2:9==t?1:0},rn=function(t,n){return n+30+st(t,n+26)+st(t,n+28)},en=function(t,n,r){var e=st(t,n+28),i=tn(t.subarray(n+46,n+46+e),!(2048&st(t,n+8))),o=n+46+e,a=ft(t,n+20),s=r&&4294967295==a?on(t,o):[a,ft(t,n+24),ft(t,n+42)],f=s[0],u=s[1],h=s[2];return[st(t,n+10),f,u,i,o+st(t,n+30)+st(t,n+32),h]},on=function(t,n){for(;1!=st(t,n);n+=4+st(t,n+2));return[ut(t,n+12),ut(t,n+4),ut(t,n+20)]},an=function(t){var n=0;if(t)for(var r in t){var e=t[r].length;if(e>65535)throw"extra field too long";n+=e+4}return n},sn=function(t,n,r,e,i,o,a,s){var f=e.length,u=r.extra,h=s&&s.length,c=an(u);ht(t,n,null!=a?33639248:67324752),n+=4,null!=a&&(t[n++]=20,t[n++]=r.os),t[n]=20,n+=2,t[n++]=r.flag<<1|(null==o&&8),t[n++]=i&&8,t[n++]=255&r.compression,t[n++]=r.compression>>8;var l=new Date(null==r.mtime?Date.now():r.mtime),p=l.getFullYear()-1980;if(p<0||p>119)throw"date not in range 1980-2099";if(ht(t,n,p<<25|l.getMonth()+1<<21|l.getDate()<<16|l.getHours()<<11|l.getMinutes()<<5|l.getSeconds()>>>1),n+=4,null!=o&&(ht(t,n,r.crc),ht(t,n+4,o),ht(t,n+8,r.size)),ht(t,n+12,f),ht(t,n+14,c),n+=16,null!=a&&(ht(t,n,h),ht(t,n+6,r.attrs),ht(t,n+10,a),n+=14),t.set(e,n),n+=f,c)for(var v in u){var d=u[v],g=d.length;ht(t,n,+v),ht(t,n+2,g),t.set(d,n+4),n+=4+g}return h&&(t.set(s,n),n+=h),n},fn=function(t,n,r,e,i){ht(t,n,101010256),ht(t,n+8,r),ht(t,n+10,r),ht(t,n+12,e),ht(t,n+16,i)},un=function(){function t(t){this.filename=t,this.c=B(),this.size=0,this.compression=0}return t.prototype.process=function(t,n){this.ondata(null,t,n)},t.prototype.push=function(t,n){if(!this.ondata)throw"no callback - add to ZIP archive before pushing";this.c.p(t),this.size+=t.length,n&&(this.crc=this.c.d()),this.process(t,n||!1)},t}();_e.ZipPassThrough=un;var hn=function(){function t(t,n){var r=this;n||(n={}),un.call(this,t),this.d=new yt(n,(function(t,n){r.ondata(null,t,n)})),this.compression=8,this.flag=nn(n.level)}return t.prototype.process=function(t,n){try{this.d.push(t,n)}catch(t){this.ondata(t,null,n)}},t.prototype.push=function(t,n){un.prototype.push.call(this,t,n)},t}();_e.ZipDeflate=hn;var cn=function(){function t(t,n){var r=this;n||(n={}),un.call(this,t),this.d=new mt(n,(function(t,n,e){r.ondata(t,n,e)})),this.compression=8,this.flag=nn(n.level),this.terminate=this.d.terminate}return t.prototype.process=function(t,n){this.d.push(t,n)},t.prototype.push=function(t,n){un.prototype.push.call(this,t,n)},t}();_e.AsyncZipDeflate=cn;var ln=function(){function t(t){this.ondata=t,this.u=[],this.d=1}return t.prototype.add=function(t){var r=this;if(2&this.d)throw"stream finished";var e=_t(t.filename),i=e.length,o=t.comment,a=o&&_t(o),s=i!=t.filename.length||a&&o.length!=a.length,f=i+an(t.extra)+30;if(i>65535)throw"filename too long";var u=new n(f);sn(u,0,t,e,s);var h=[u],c=function(){for(var t=0,n=h;t<n.length;t++)r.ondata(null,n[t],!1);h=[]},l=this.d;this.d=0;var p=this.u.length,v=L(t,{f:e,u:s,o:a,t:function(){t.terminate&&t.terminate()},r:function(){if(c(),l){var t=r.u[p+1];t?t.r():r.d=1}l=1}}),d=0;t.ondata=function(e,i,o){if(e)r.ondata(e,i,o),r.terminate();else if(d+=i.length,h.push(i),o){var a=new n(16);ht(a,0,134695760),ht(a,4,t.crc),ht(a,8,d),ht(a,12,t.size),h.push(a),v.c=d,v.b=f+d+16,v.crc=t.crc,v.size=t.size,l&&v.r(),l=1}else l&&c()},this.u.push(v)},t.prototype.end=function(){var t=this;if(2&this.d){if(1&this.d)throw"stream finishing";throw"stream finished"}this.d?this.e():this.u.push({r:function(){1&t.d&&(t.u.splice(-1,1),t.e())},t:function(){}}),this.d=3},t.prototype.e=function(){for(var t=0,r=0,e=0,i=0,o=this.u;i<o.length;i++)e+=46+(u=o[i]).f.length+an(u.extra)+(u.o?u.o.length:0);for(var a=new n(e+22),s=0,f=this.u;s<f.length;s++){var u;sn(a,t,u=f[s],u.f,u.u,u.c,r,u.o),t+=46+u.f.length+an(u.extra)+(u.o?u.o.length:0),r+=u.b}fn(a,t,this.u.length,e,r),this.ondata(null,a,!0),this.d=2},t.prototype.terminate=function(){for(var t=0,n=this.u;t<n.length;t++)n[t].t();this.d=2},t}();function pn(t,r,e){if(e||(e=r,r={}),"function"!=typeof e)throw"no callback";var i={};Nt(t,"",i,r);var o=Object.keys(i),a=o.length,s=0,f=0,u=a,h=Array(a),c=[],l=function(){for(var t=0;t<c.length;++t)c[t]()},p=function(){var t=new n(f+22),r=s,i=f-s;f=0;for(var o=0;o<u;++o){var a=h[o];try{var c=a.c.length;sn(t,f,a,a.f,a.u,c);var l=30+a.f.length+an(a.extra),p=f+l;t.set(a.c,p),sn(t,s,a,a.f,a.u,c,f,a.m),s+=16+l+(a.m?a.m.length:0),f=p+c}catch(t){return e(t,null)}}fn(t,s,h.length,i,r),e(null,t)};a||p();for(var v=function(t){var n=o[t],r=i[n],u=r[0],v=r[1],d=B(),g=u.length;d.p(u);var w=_t(n),y=w.length,m=v.comment,b=m&&_t(m),x=b&&b.length,z=an(v.extra),k=0==v.level?0:8,M=function(r,i){if(r)l(),e(r,null);else{var o=i.length;h[t]=L(v,{size:g,crc:d.d(),c:i,f:w,m:b,u:y!=n.length||b&&m.length!=x,compression:k}),s+=30+y+z+o,f+=76+2*(y+z)+(x||0)+o,--a||p()}};if(y>65535&&M("filename too long",null),k)if(g<16e4)try{M(null,xt(u,v))}catch(t){M(t,null)}else c.push(bt(u,v,M));else M(null,u)},d=0;d<u;++d)v(d);return l}function vn(t,r){r||(r={});var e={},i=[];Nt(t,"",e,r);var o=0,a=0;for(var s in e){var f=e[s],u=f[0],h=f[1],c=0==h.level?0:8,l=(M=_t(s)).length,p=h.comment,v=p&&_t(p),d=v&&v.length,g=an(h.extra);if(l>65535)throw"filename too long";var w=c?xt(u,h):u,y=w.length,m=B();m.p(u),i.push(L(h,{size:u.length,crc:m.d(),c:w,f:M,m:v,u:l!=s.length||v&&p.length!=d,o:o,compression:c})),o+=30+l+g+y,a+=76+2*(l+g)+(d||0)+y}for(var b=new n(a+22),x=o,z=a-o,k=0;k<i.length;++k){var M;sn(b,(M=i[k]).o,M,M.f,M.u,M.c.length);var A=30+M.f.length+an(M.extra);b.set(M.c,M.o+A),sn(b,o,M,M.f,M.u,M.c.length,M.o,M.m),o+=16+A+(M.m?M.m.length:0)}return fn(b,o,i.length,z,x),b}_e.Zip=ln,_e.zip=pn,_e.zipSync=vn;var dn=function(){function t(){}return t.prototype.push=function(t,n){this.ondata(null,t,n)},t.compression=0,t}();_e.UnzipPassThrough=dn;var gn=function(){function t(){var t=this;this.i=new zt((function(n,r){t.ondata(null,n,r)}))}return t.prototype.push=function(t,n){try{this.i.push(t,n)}catch(r){this.ondata(r,t,n)}},t.compression=8,t}();_e.UnzipInflate=gn;var wn=function(){function t(t,n){var r=this;n<32e4?this.i=new zt((function(t,n){r.ondata(null,t,n)})):(this.i=new kt((function(t,n,e){r.ondata(t,n,e)})),this.terminate=this.i.terminate)}return t.prototype.push=function(t,n){this.i.terminate&&(t=C(t,0)),this.i.push(t,n)},t.compression=8,t}();_e.AsyncUnzipInflate=wn;var yn=function(){function t(t){this.onfile=t,this.k=[],this.o={0:dn},this.p=q}return t.prototype.push=function(t,r){var e=this;if(!this.onfile)throw"no callback";if(!this.p)throw"stream finished";if(this.c>0){var i=Math.min(this.c,t.length),o=t.subarray(0,i);if(this.c-=i,this.d?this.d.push(o,!this.c):this.k[0].push(o),(t=t.subarray(i)).length)return this.push(t,r)}else{var a=0,s=0,f=void 0,u=void 0;this.p.length?t.length?((u=new n(this.p.length+t.length)).set(this.p),u.set(t,this.p.length)):u=this.p:u=t;for(var h=u.length,c=this.c,l=c&&this.d,p=function(){var t,n=ft(u,s);if(67324752==n){a=1,f=s,v.d=null,v.c=0;var r=st(u,s+6),i=st(u,s+8),o=2048&r,l=8&r,p=st(u,s+26),d=st(u,s+28);if(h>s+30+p+d){var g=[];v.k.unshift(g),a=2;var w,y=ft(u,s+18),m=ft(u,s+22),b=tn(u.subarray(s+30,s+=30+p),!o);4294967295==y?(t=l?[-2]:on(u,s),y=t[0],m=t[1]):l&&(y=-1),s+=d,v.c=y;var x={name:b,compression:i,start:function(){if(!x.ondata)throw"no callback";if(y){var t=e.o[i];if(!t)throw"unknown compression type "+i;(w=y<0?new t(b):new t(b,y,m)).ondata=function(t,n,r){x.ondata(t,n,r)};for(var n=0,r=g;n<r.length;n++)w.push(r[n],!1);e.k[0]==g&&e.c?e.d=w:w.push(q,!0)}else x.ondata(null,q,!0)},terminate:function(){w&&w.terminate&&w.terminate()}};y>=0&&(x.size=y,x.originalSize=m),v.onfile(x)}return"break"}if(c){if(134695760==n)return f=s+=12+(-2==c&&8),a=3,v.c=0,"break";if(33639248==n)return f=s-=4,a=3,v.c=0,"break"}},v=this;s<h-4&&"break"!==p();++s);if(this.p=q,c<0){var d=u.subarray(0,a?f-12-(-2==c&&8)-(134695760==ft(u,f-16)&&4):s);l?l.push(d,!!a):this.k[+(2==a)].push(d)}if(2&a)return this.push(u.subarray(s),r);this.p=u.subarray(s)}if(r){if(this.c)throw"invalid zip file";this.p=null}},t.prototype.register=function(t){this.o[t.compression]=t},t}();function mn(t,r){if("function"!=typeof r)throw"no callback";for(var e=[],i=function(){for(var t=0;t<e.length;++t)e[t]()},o={},a=t.length-22;101010256!=ft(t,a);--a)if(!a||t.length-a>65558)return void r("invalid zip file",null);var s=st(t,a+8);s||r(null,{});var f=s,u=ft(t,a+16),h=4294967295==u;if(h){if(a=ft(t,a-12),101075792!=ft(t,a))return void r("invalid zip file",null);f=s=ft(t,a+32),u=ft(t,a+48)}for(var c=function(a){var f=en(t,u,h),c=f[0],l=f[1],p=f[2],v=f[3],d=f[4],g=rn(t,f[5]);u=d;var w=function(t,n){t?(i(),r(t,null)):(o[v]=n,--s||r(null,o))};if(c)if(8==c){var y=t.subarray(g,g+l);if(l<32e4)try{w(null,At(y,new n(p)))}catch(t){w(t,null)}else e.push(Mt(y,{size:p},w))}else w("unknown compression type "+c,null);else w(null,C(t,g,g+l))},l=0;l<f;++l)c();return i}function bn(t){for(var r={},e=t.length-22;101010256!=ft(t,e);--e)if(!e||t.length-e>65558)throw"invalid zip file";var i=st(t,e+8);if(!i)return{};var o=ft(t,e+16),a=4294967295==o;if(a){if(e=ft(t,e-12),101075792!=ft(t,e))throw"invalid zip file";i=ft(t,e+32),o=ft(t,e+48)}for(var s=0;s<i;++s){var f=en(t,o,a),u=f[0],h=f[1],c=f[2],l=f[3],p=f[4],v=rn(t,f[5]);if(o=p,u){if(8!=u)throw"unknown compression type "+u;r[l]=At(t.subarray(v,v+h),new n(c))}else r[l]=C(t,v,v+h)}return r}_e.Unzip=yn,_e.unzip=mn,_e.unzipSync=bn;return _e})

;/* ---- loaders/EXRLoader.js ---- */
( function () {

	/**
 * OpenEXR loader currently supports uncompressed, ZIP(S), RLE, PIZ and DWA/B compression.
 * Supports reading as UnsignedByte, HalfFloat and Float type data texture.
 *
 * Referred to the original Industrial Light & Magic OpenEXR implementation and the TinyEXR / Syoyo Fujita
 * implementation, so I have preserved their copyright notices.
 */
	// /*
	// Copyright (c) 2014 - 2017, Syoyo Fujita
	// All rights reserved.
	// Redistribution and use in source and binary forms, with or without
	// modification, are permitted provided that the following conditions are met:
	//     * Redistributions of source code must retain the above copyright
	//       notice, this list of conditions and the following disclaimer.
	//     * Redistributions in binary form must reproduce the above copyright
	//       notice, this list of conditions and the following disclaimer in the
	//       documentation and/or other materials provided with the distribution.
	//     * Neither the name of the Syoyo Fujita nor the
	//       names of its contributors may be used to endorse or promote products
	//       derived from this software without specific prior written permission.
	// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
	// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
	// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
	// DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
	// DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
	// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
	// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
	// ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
	// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
	// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	// */
	// // TinyEXR contains some OpenEXR code, which is licensed under ------------
	// ///////////////////////////////////////////////////////////////////////////
	// //
	// // Copyright (c) 2002, Industrial Light & Magic, a division of Lucas
	// // Digital Ltd. LLC
	// //
	// // All rights reserved.
	// //
	// // Redistribution and use in source and binary forms, with or without
	// // modification, are permitted provided that the following conditions are
	// // met:
	// // *       Redistributions of source code must retain the above copyright
	// // notice, this list of conditions and the following disclaimer.
	// // *       Redistributions in binary form must reproduce the above
	// // copyright notice, this list of conditions and the following disclaimer
	// // in the documentation and/or other materials provided with the
	// // distribution.
	// // *       Neither the name of Industrial Light & Magic nor the names of
	// // its contributors may be used to endorse or promote products derived
	// // from this software without specific prior written permission.
	// //
	// // THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
	// // "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
	// // LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
	// // A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
	// // OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
	// // SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	// // LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
	// // DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
	// // THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
	// // (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
	// // OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	// //
	// ///////////////////////////////////////////////////////////////////////////
	// // End of OpenEXR license -------------------------------------------------

	class EXRLoader extends THREE.DataTextureLoader {

		constructor( manager ) {

			super( manager );
			this.type = THREE.FloatType;

		}

		parse( buffer ) {

			const USHORT_RANGE = 1 << 16;
			const BITMAP_SIZE = USHORT_RANGE >> 3;
			const HUF_ENCBITS = 16; // literal (value) bit length

			const HUF_DECBITS = 14; // decoding bit size (>= 8)

			const HUF_ENCSIZE = ( 1 << HUF_ENCBITS ) + 1; // encoding table size

			const HUF_DECSIZE = 1 << HUF_DECBITS; // decoding table size

			const HUF_DECMASK = HUF_DECSIZE - 1;
			const NBITS = 16;
			const A_OFFSET = 1 << NBITS - 1;
			const MOD_MASK = ( 1 << NBITS ) - 1;
			const SHORT_ZEROCODE_RUN = 59;
			const LONG_ZEROCODE_RUN = 63;
			const SHORTEST_LONG_RUN = 2 + LONG_ZEROCODE_RUN - SHORT_ZEROCODE_RUN;
			const ULONG_SIZE = 8;
			const FLOAT32_SIZE = 4;
			const INT32_SIZE = 4;
			const INT16_SIZE = 2;
			const INT8_SIZE = 1;
			const STATIC_HUFFMAN = 0;
			const DEFLATE = 1;
			const UNKNOWN = 0;
			const LOSSY_DCT = 1;
			const RLE = 2;
			const logBase = Math.pow( 2.7182818, 2.2 );
			var tmpDataView = new DataView( new ArrayBuffer( 8 ) );

			function frexp( value ) {

				if ( value === 0 ) return [ value, 0 ];
				tmpDataView.setFloat64( 0, value );
				var bits = tmpDataView.getUint32( 0 ) >>> 20 & 0x7FF;

				if ( bits === 0 ) {

					// denormal
					tmpDataView.setFloat64( 0, value * Math.pow( 2, 64 ) ); // exp + 64

					bits = ( tmpDataView.getUint32( 0 ) >>> 20 & 0x7FF ) - 64;

				}

				var exponent = bits - 1022;
				var mantissa = ldexp( value, - exponent );
				return [ mantissa, exponent ];

			}

			function ldexp( mantissa, exponent ) {

				var steps = Math.min( 3, Math.ceil( Math.abs( exponent ) / 1023 ) );
				var result = mantissa;

				for ( var i = 0; i < steps; i ++ ) result *= Math.pow( 2, Math.floor( ( exponent + i ) / steps ) );

				return result;

			}

			function reverseLutFromBitmap( bitmap, lut ) {

				var k = 0;

				for ( var i = 0; i < USHORT_RANGE; ++ i ) {

					if ( i == 0 || bitmap[ i >> 3 ] & 1 << ( i & 7 ) ) {

						lut[ k ++ ] = i;

					}

				}

				var n = k - 1;

				while ( k < USHORT_RANGE ) lut[ k ++ ] = 0;

				return n;

			}

			function hufClearDecTable( hdec ) {

				for ( var i = 0; i < HUF_DECSIZE; i ++ ) {

					hdec[ i ] = {};
					hdec[ i ].len = 0;
					hdec[ i ].lit = 0;
					hdec[ i ].p = null;

				}

			}

			const getBitsReturn = {
				l: 0,
				c: 0,
				lc: 0
			};

			function getBits( nBits, c, lc, uInt8Array, inOffset ) {

				while ( lc < nBits ) {

					c = c << 8 | parseUint8Array( uInt8Array, inOffset );
					lc += 8;

				}

				lc -= nBits;
				getBitsReturn.l = c >> lc & ( 1 << nBits ) - 1;
				getBitsReturn.c = c;
				getBitsReturn.lc = lc;

			}

			const hufTableBuffer = new Array( 59 );

			function hufCanonicalCodeTable( hcode ) {

				for ( var i = 0; i <= 58; ++ i ) hufTableBuffer[ i ] = 0;

				for ( var i = 0; i < HUF_ENCSIZE; ++ i ) hufTableBuffer[ hcode[ i ] ] += 1;

				var c = 0;

				for ( var i = 58; i > 0; -- i ) {

					var nc = c + hufTableBuffer[ i ] >> 1;
					hufTableBuffer[ i ] = c;
					c = nc;

				}

				for ( var i = 0; i < HUF_ENCSIZE; ++ i ) {

					var l = hcode[ i ];
					if ( l > 0 ) hcode[ i ] = l | hufTableBuffer[ l ] ++ << 6;

				}

			}

			function hufUnpackEncTable( uInt8Array, inDataView, inOffset, ni, im, iM, hcode ) {

				var p = inOffset;
				var c = 0;
				var lc = 0;

				for ( ; im <= iM; im ++ ) {

					if ( p.value - inOffset.value > ni ) return false;
					getBits( 6, c, lc, uInt8Array, p );
					var l = getBitsReturn.l;
					c = getBitsReturn.c;
					lc = getBitsReturn.lc;
					hcode[ im ] = l;

					if ( l == LONG_ZEROCODE_RUN ) {

						if ( p.value - inOffset.value > ni ) {

							throw 'Something wrong with hufUnpackEncTable';

						}

						getBits( 8, c, lc, uInt8Array, p );
						var zerun = getBitsReturn.l + SHORTEST_LONG_RUN;
						c = getBitsReturn.c;
						lc = getBitsReturn.lc;

						if ( im + zerun > iM + 1 ) {

							throw 'Something wrong with hufUnpackEncTable';

						}

						while ( zerun -- ) hcode[ im ++ ] = 0;

						im --;

					} else if ( l >= SHORT_ZEROCODE_RUN ) {

						var zerun = l - SHORT_ZEROCODE_RUN + 2;

						if ( im + zerun > iM + 1 ) {

							throw 'Something wrong with hufUnpackEncTable';

						}

						while ( zerun -- ) hcode[ im ++ ] = 0;

						im --;

					}

				}

				hufCanonicalCodeTable( hcode );

			}

			function hufLength( code ) {

				return code & 63;

			}

			function hufCode( code ) {

				return code >> 6;

			}

			function hufBuildDecTable( hcode, im, iM, hdecod ) {

				for ( ; im <= iM; im ++ ) {

					var c = hufCode( hcode[ im ] );
					var l = hufLength( hcode[ im ] );

					if ( c >> l ) {

						throw 'Invalid table entry';

					}

					if ( l > HUF_DECBITS ) {

						var pl = hdecod[ c >> l - HUF_DECBITS ];

						if ( pl.len ) {

							throw 'Invalid table entry';

						}

						pl.lit ++;

						if ( pl.p ) {

							var p = pl.p;
							pl.p = new Array( pl.lit );

							for ( var i = 0; i < pl.lit - 1; ++ i ) {

								pl.p[ i ] = p[ i ];

							}

						} else {

							pl.p = new Array( 1 );

						}

						pl.p[ pl.lit - 1 ] = im;

					} else if ( l ) {

						var plOffset = 0;

						for ( var i = 1 << HUF_DECBITS - l; i > 0; i -- ) {

							var pl = hdecod[ ( c << HUF_DECBITS - l ) + plOffset ];

							if ( pl.len || pl.p ) {

								throw 'Invalid table entry';

							}

							pl.len = l;
							pl.lit = im;
							plOffset ++;

						}

					}

				}

				return true;

			}

			const getCharReturn = {
				c: 0,
				lc: 0
			};

			function getChar( c, lc, uInt8Array, inOffset ) {

				c = c << 8 | parseUint8Array( uInt8Array, inOffset );
				lc += 8;
				getCharReturn.c = c;
				getCharReturn.lc = lc;

			}

			const getCodeReturn = {
				c: 0,
				lc: 0
			};

			function getCode( po, rlc, c, lc, uInt8Array, inDataView, inOffset, outBuffer, outBufferOffset, outBufferEndOffset ) {

				if ( po == rlc ) {

					if ( lc < 8 ) {

						getChar( c, lc, uInt8Array, inOffset );
						c = getCharReturn.c;
						lc = getCharReturn.lc;

					}

					lc -= 8;
					var cs = c >> lc;
					var cs = new Uint8Array( [ cs ] )[ 0 ];

					if ( outBufferOffset.value + cs > outBufferEndOffset ) {

						return false;

					}

					var s = outBuffer[ outBufferOffset.value - 1 ];

					while ( cs -- > 0 ) {

						outBuffer[ outBufferOffset.value ++ ] = s;

					}

				} else if ( outBufferOffset.value < outBufferEndOffset ) {

					outBuffer[ outBufferOffset.value ++ ] = po;

				} else {

					return false;

				}

				getCodeReturn.c = c;
				getCodeReturn.lc = lc;

			}

			function UInt16( value ) {

				return value & 0xFFFF;

			}

			function Int16( value ) {

				var ref = UInt16( value );
				return ref > 0x7FFF ? ref - 0x10000 : ref;

			}

			const wdec14Return = {
				a: 0,
				b: 0
			};

			function wdec14( l, h ) {

				var ls = Int16( l );
				var hs = Int16( h );
				var hi = hs;
				var ai = ls + ( hi & 1 ) + ( hi >> 1 );
				var as = ai;
				var bs = ai - hi;
				wdec14Return.a = as;
				wdec14Return.b = bs;

			}

			function wdec16( l, h ) {

				var m = UInt16( l );
				var d = UInt16( h );
				var bb = m - ( d >> 1 ) & MOD_MASK;
				var aa = d + bb - A_OFFSET & MOD_MASK;
				wdec14Return.a = aa;
				wdec14Return.b = bb;

			}

			function wav2Decode( buffer, j, nx, ox, ny, oy, mx ) {

				var w14 = mx < 1 << 14;
				var n = nx > ny ? ny : nx;
				var p = 1;
				var p2;

				while ( p <= n ) p <<= 1;

				p >>= 1;
				p2 = p;
				p >>= 1;

				while ( p >= 1 ) {

					var py = 0;
					var ey = py + oy * ( ny - p2 );
					var oy1 = oy * p;
					var oy2 = oy * p2;
					var ox1 = ox * p;
					var ox2 = ox * p2;
					var i00, i01, i10, i11;

					for ( ; py <= ey; py += oy2 ) {

						var px = py;
						var ex = py + ox * ( nx - p2 );

						for ( ; px <= ex; px += ox2 ) {

							var p01 = px + ox1;
							var p10 = px + oy1;
							var p11 = p10 + ox1;

							if ( w14 ) {

								wdec14( buffer[ px + j ], buffer[ p10 + j ] );
								i00 = wdec14Return.a;
								i10 = wdec14Return.b;
								wdec14( buffer[ p01 + j ], buffer[ p11 + j ] );
								i01 = wdec14Return.a;
								i11 = wdec14Return.b;
								wdec14( i00, i01 );
								buffer[ px + j ] = wdec14Return.a;
								buffer[ p01 + j ] = wdec14Return.b;
								wdec14( i10, i11 );
								buffer[ p10 + j ] = wdec14Return.a;
								buffer[ p11 + j ] = wdec14Return.b;

							} else {

								wdec16( buffer[ px + j ], buffer[ p10 + j ] );
								i00 = wdec14Return.a;
								i10 = wdec14Return.b;
								wdec16( buffer[ p01 + j ], buffer[ p11 + j ] );
								i01 = wdec14Return.a;
								i11 = wdec14Return.b;
								wdec16( i00, i01 );
								buffer[ px + j ] = wdec14Return.a;
								buffer[ p01 + j ] = wdec14Return.b;
								wdec16( i10, i11 );
								buffer[ p10 + j ] = wdec14Return.a;
								buffer[ p11 + j ] = wdec14Return.b;

							}

						}

						if ( nx & p ) {

							var p10 = px + oy1;
							if ( w14 ) wdec14( buffer[ px + j ], buffer[ p10 + j ] ); else wdec16( buffer[ px + j ], buffer[ p10 + j ] );
							i00 = wdec14Return.a;
							buffer[ p10 + j ] = wdec14Return.b;
							buffer[ px + j ] = i00;

						}

					}

					if ( ny & p ) {

						var px = py;
						var ex = py + ox * ( nx - p2 );

						for ( ; px <= ex; px += ox2 ) {

							var p01 = px + ox1;
							if ( w14 ) wdec14( buffer[ px + j ], buffer[ p01 + j ] ); else wdec16( buffer[ px + j ], buffer[ p01 + j ] );
							i00 = wdec14Return.a;
							buffer[ p01 + j ] = wdec14Return.b;
							buffer[ px + j ] = i00;

						}

					}

					p2 = p;
					p >>= 1;

				}

				return py;

			}

			function hufDecode( encodingTable, decodingTable, uInt8Array, inDataView, inOffset, ni, rlc, no, outBuffer, outOffset ) {

				var c = 0;
				var lc = 0;
				var outBufferEndOffset = no;
				var inOffsetEnd = Math.trunc( inOffset.value + ( ni + 7 ) / 8 );

				while ( inOffset.value < inOffsetEnd ) {

					getChar( c, lc, uInt8Array, inOffset );
					c = getCharReturn.c;
					lc = getCharReturn.lc;

					while ( lc >= HUF_DECBITS ) {

						var index = c >> lc - HUF_DECBITS & HUF_DECMASK;
						var pl = decodingTable[ index ];

						if ( pl.len ) {

							lc -= pl.len;
							getCode( pl.lit, rlc, c, lc, uInt8Array, inDataView, inOffset, outBuffer, outOffset, outBufferEndOffset );
							c = getCodeReturn.c;
							lc = getCodeReturn.lc;

						} else {

							if ( ! pl.p ) {

								throw 'hufDecode issues';

							}

							var j;

							for ( j = 0; j < pl.lit; j ++ ) {

								var l = hufLength( encodingTable[ pl.p[ j ] ] );

								while ( lc < l && inOffset.value < inOffsetEnd ) {

									getChar( c, lc, uInt8Array, inOffset );
									c = getCharReturn.c;
									lc = getCharReturn.lc;

								}

								if ( lc >= l ) {

									if ( hufCode( encodingTable[ pl.p[ j ] ] ) == ( c >> lc - l & ( 1 << l ) - 1 ) ) {

										lc -= l;
										getCode( pl.p[ j ], rlc, c, lc, uInt8Array, inDataView, inOffset, outBuffer, outOffset, outBufferEndOffset );
										c = getCodeReturn.c;
										lc = getCodeReturn.lc;
										break;

									}

								}

							}

							if ( j == pl.lit ) {

								throw 'hufDecode issues';

							}

						}

					}

				}

				var i = 8 - ni & 7;
				c >>= i;
				lc -= i;

				while ( lc > 0 ) {

					var pl = decodingTable[ c << HUF_DECBITS - lc & HUF_DECMASK ];

					if ( pl.len ) {

						lc -= pl.len;
						getCode( pl.lit, rlc, c, lc, uInt8Array, inDataView, inOffset, outBuffer, outOffset, outBufferEndOffset );
						c = getCodeReturn.c;
						lc = getCodeReturn.lc;

					} else {

						throw 'hufDecode issues';

					}

				}

				return true;

			}

			function hufUncompress( uInt8Array, inDataView, inOffset, nCompressed, outBuffer, nRaw ) {

				var outOffset = {
					value: 0
				};
				var initialInOffset = inOffset.value;
				var im = parseUint32( inDataView, inOffset );
				var iM = parseUint32( inDataView, inOffset );
				inOffset.value += 4;
				var nBits = parseUint32( inDataView, inOffset );
				inOffset.value += 4;

				if ( im < 0 || im >= HUF_ENCSIZE || iM < 0 || iM >= HUF_ENCSIZE ) {

					throw 'Something wrong with HUF_ENCSIZE';

				}

				var freq = new Array( HUF_ENCSIZE );
				var hdec = new Array( HUF_DECSIZE );
				hufClearDecTable( hdec );
				var ni = nCompressed - ( inOffset.value - initialInOffset );
				hufUnpackEncTable( uInt8Array, inDataView, inOffset, ni, im, iM, freq );

				if ( nBits > 8 * ( nCompressed - ( inOffset.value - initialInOffset ) ) ) {

					throw 'Something wrong with hufUncompress';

				}

				hufBuildDecTable( freq, im, iM, hdec );
				hufDecode( freq, hdec, uInt8Array, inDataView, inOffset, nBits, iM, nRaw, outBuffer, outOffset );

			}

			function applyLut( lut, data, nData ) {

				for ( var i = 0; i < nData; ++ i ) {

					data[ i ] = lut[ data[ i ] ];

				}

			}

			function predictor( source ) {

				for ( var t = 1; t < source.length; t ++ ) {

					var d = source[ t - 1 ] + source[ t ] - 128;
					source[ t ] = d;

				}

			}

			function interleaveScalar( source, out ) {

				var t1 = 0;
				var t2 = Math.floor( ( source.length + 1 ) / 2 );
				var s = 0;
				var stop = source.length - 1;

				while ( true ) {

					if ( s > stop ) break;
					out[ s ++ ] = source[ t1 ++ ];
					if ( s > stop ) break;
					out[ s ++ ] = source[ t2 ++ ];

				}

			}

			function decodeRunLength( source ) {

				var size = source.byteLength;
				var out = new Array();
				var p = 0;
				var reader = new DataView( source );

				while ( size > 0 ) {

					var l = reader.getInt8( p ++ );

					if ( l < 0 ) {

						var count = - l;
						size -= count + 1;

						for ( var i = 0; i < count; i ++ ) {

							out.push( reader.getUint8( p ++ ) );

						}

					} else {

						var count = l;
						size -= 2;
						var value = reader.getUint8( p ++ );

						for ( var i = 0; i < count + 1; i ++ ) {

							out.push( value );

						}

					}

				}

				return out;

			}

			function lossyDctDecode( cscSet, rowPtrs, channelData, acBuffer, dcBuffer, outBuffer ) {

				var dataView = new DataView( outBuffer.buffer );
				var width = channelData[ cscSet.idx[ 0 ] ].width;
				var height = channelData[ cscSet.idx[ 0 ] ].height;
				var numComp = 3;
				var numFullBlocksX = Math.floor( width / 8.0 );
				var numBlocksX = Math.ceil( width / 8.0 );
				var numBlocksY = Math.ceil( height / 8.0 );
				var leftoverX = width - ( numBlocksX - 1 ) * 8;
				var leftoverY = height - ( numBlocksY - 1 ) * 8;
				var currAcComp = {
					value: 0
				};
				var currDcComp = new Array( numComp );
				var dctData = new Array( numComp );
				var halfZigBlock = new Array( numComp );
				var rowBlock = new Array( numComp );
				var rowOffsets = new Array( numComp );

				for ( let comp = 0; comp < numComp; ++ comp ) {

					rowOffsets[ comp ] = rowPtrs[ cscSet.idx[ comp ] ];
					currDcComp[ comp ] = comp < 1 ? 0 : currDcComp[ comp - 1 ] + numBlocksX * numBlocksY;
					dctData[ comp ] = new Float32Array( 64 );
					halfZigBlock[ comp ] = new Uint16Array( 64 );
					rowBlock[ comp ] = new Uint16Array( numBlocksX * 64 );

				}

				for ( let blocky = 0; blocky < numBlocksY; ++ blocky ) {

					var maxY = 8;
					if ( blocky == numBlocksY - 1 ) maxY = leftoverY;
					var maxX = 8;

					for ( let blockx = 0; blockx < numBlocksX; ++ blockx ) {

						if ( blockx == numBlocksX - 1 ) maxX = leftoverX;

						for ( let comp = 0; comp < numComp; ++ comp ) {

							halfZigBlock[ comp ].fill( 0 ); // set block DC component

							halfZigBlock[ comp ][ 0 ] = dcBuffer[ currDcComp[ comp ] ++ ]; // set block AC components

							unRleAC( currAcComp, acBuffer, halfZigBlock[ comp ] ); // UnZigZag block to float

							unZigZag( halfZigBlock[ comp ], dctData[ comp ] ); // decode float dct

							dctInverse( dctData[ comp ] );

						}

						if ( numComp == 3 ) {

							csc709Inverse( dctData );

						}

						for ( let comp = 0; comp < numComp; ++ comp ) {

							convertToHalf( dctData[ comp ], rowBlock[ comp ], blockx * 64 );

						}

					} // blockx


					let offset = 0;

					for ( let comp = 0; comp < numComp; ++ comp ) {

						const type = channelData[ cscSet.idx[ comp ] ].type;

						for ( let y = 8 * blocky; y < 8 * blocky + maxY; ++ y ) {

							offset = rowOffsets[ comp ][ y ];

							for ( let blockx = 0; blockx < numFullBlocksX; ++ blockx ) {

								const src = blockx * 64 + ( y & 0x7 ) * 8;
								dataView.setUint16( offset + 0 * INT16_SIZE * type, rowBlock[ comp ][ src + 0 ], true );
								dataView.setUint16( offset + 1 * INT16_SIZE * type, rowBlock[ comp ][ src + 1 ], true );
								dataView.setUint16( offset + 2 * INT16_SIZE * type, rowBlock[ comp ][ src + 2 ], true );
								dataView.setUint16( offset + 3 * INT16_SIZE * type, rowBlock[ comp ][ src + 3 ], true );
								dataView.setUint16( offset + 4 * INT16_SIZE * type, rowBlock[ comp ][ src + 4 ], true );
								dataView.setUint16( offset + 5 * INT16_SIZE * type, rowBlock[ comp ][ src + 5 ], true );
								dataView.setUint16( offset + 6 * INT16_SIZE * type, rowBlock[ comp ][ src + 6 ], true );
								dataView.setUint16( offset + 7 * INT16_SIZE * type, rowBlock[ comp ][ src + 7 ], true );
								offset += 8 * INT16_SIZE * type;

							}

						} // handle partial X blocks


						if ( numFullBlocksX != numBlocksX ) {

							for ( let y = 8 * blocky; y < 8 * blocky + maxY; ++ y ) {

								const offset = rowOffsets[ comp ][ y ] + 8 * numFullBlocksX * INT16_SIZE * type;
								const src = numFullBlocksX * 64 + ( y & 0x7 ) * 8;

								for ( let x = 0; x < maxX; ++ x ) {

									dataView.setUint16( offset + x * INT16_SIZE * type, rowBlock[ comp ][ src + x ], true );

								}

							}

						}

					} // comp

				} // blocky


				var halfRow = new Uint16Array( width );
				var dataView = new DataView( outBuffer.buffer ); // convert channels back to float, if needed

				for ( var comp = 0; comp < numComp; ++ comp ) {

					channelData[ cscSet.idx[ comp ] ].decoded = true;
					var type = channelData[ cscSet.idx[ comp ] ].type;
					if ( channelData[ comp ].type != 2 ) continue;

					for ( var y = 0; y < height; ++ y ) {

						const offset = rowOffsets[ comp ][ y ];

						for ( var x = 0; x < width; ++ x ) {

							halfRow[ x ] = dataView.getUint16( offset + x * INT16_SIZE * type, true );

						}

						for ( var x = 0; x < width; ++ x ) {

							dataView.setFloat32( offset + x * INT16_SIZE * type, decodeFloat16( halfRow[ x ] ), true );

						}

					}

				}

			}

			function unRleAC( currAcComp, acBuffer, halfZigBlock ) {

				var acValue;
				var dctComp = 1;

				while ( dctComp < 64 ) {

					acValue = acBuffer[ currAcComp.value ];

					if ( acValue == 0xff00 ) {

						dctComp = 64;

					} else if ( acValue >> 8 == 0xff ) {

						dctComp += acValue & 0xff;

					} else {

						halfZigBlock[ dctComp ] = acValue;
						dctComp ++;

					}

					currAcComp.value ++;

				}

			}

			function unZigZag( src, dst ) {

				dst[ 0 ] = decodeFloat16( src[ 0 ] );
				dst[ 1 ] = decodeFloat16( src[ 1 ] );
				dst[ 2 ] = decodeFloat16( src[ 5 ] );
				dst[ 3 ] = decodeFloat16( src[ 6 ] );
				dst[ 4 ] = decodeFloat16( src[ 14 ] );
				dst[ 5 ] = decodeFloat16( src[ 15 ] );
				dst[ 6 ] = decodeFloat16( src[ 27 ] );
				dst[ 7 ] = decodeFloat16( src[ 28 ] );
				dst[ 8 ] = decodeFloat16( src[ 2 ] );
				dst[ 9 ] = decodeFloat16( src[ 4 ] );
				dst[ 10 ] = decodeFloat16( src[ 7 ] );
				dst[ 11 ] = decodeFloat16( src[ 13 ] );
				dst[ 12 ] = decodeFloat16( src[ 16 ] );
				dst[ 13 ] = decodeFloat16( src[ 26 ] );
				dst[ 14 ] = decodeFloat16( src[ 29 ] );
				dst[ 15 ] = decodeFloat16( src[ 42 ] );
				dst[ 16 ] = decodeFloat16( src[ 3 ] );
				dst[ 17 ] = decodeFloat16( src[ 8 ] );
				dst[ 18 ] = decodeFloat16( src[ 12 ] );
				dst[ 19 ] = decodeFloat16( src[ 17 ] );
				dst[ 20 ] = decodeFloat16( src[ 25 ] );
				dst[ 21 ] = decodeFloat16( src[ 30 ] );
				dst[ 22 ] = decodeFloat16( src[ 41 ] );
				dst[ 23 ] = decodeFloat16( src[ 43 ] );
				dst[ 24 ] = decodeFloat16( src[ 9 ] );
				dst[ 25 ] = decodeFloat16( src[ 11 ] );
				dst[ 26 ] = decodeFloat16( src[ 18 ] );
				dst[ 27 ] = decodeFloat16( src[ 24 ] );
				dst[ 28 ] = decodeFloat16( src[ 31 ] );
				dst[ 29 ] = decodeFloat16( src[ 40 ] );
				dst[ 30 ] = decodeFloat16( src[ 44 ] );
				dst[ 31 ] = decodeFloat16( src[ 53 ] );
				dst[ 32 ] = decodeFloat16( src[ 10 ] );
				dst[ 33 ] = decodeFloat16( src[ 19 ] );
				dst[ 34 ] = decodeFloat16( src[ 23 ] );
				dst[ 35 ] = decodeFloat16( src[ 32 ] );
				dst[ 36 ] = decodeFloat16( src[ 39 ] );
				dst[ 37 ] = decodeFloat16( src[ 45 ] );
				dst[ 38 ] = decodeFloat16( src[ 52 ] );
				dst[ 39 ] = decodeFloat16( src[ 54 ] );
				dst[ 40 ] = decodeFloat16( src[ 20 ] );
				dst[ 41 ] = decodeFloat16( src[ 22 ] );
				dst[ 42 ] = decodeFloat16( src[ 33 ] );
				dst[ 43 ] = decodeFloat16( src[ 38 ] );
				dst[ 44 ] = decodeFloat16( src[ 46 ] );
				dst[ 45 ] = decodeFloat16( src[ 51 ] );
				dst[ 46 ] = decodeFloat16( src[ 55 ] );
				dst[ 47 ] = decodeFloat16( src[ 60 ] );
				dst[ 48 ] = decodeFloat16( src[ 21 ] );
				dst[ 49 ] = decodeFloat16( src[ 34 ] );
				dst[ 50 ] = decodeFloat16( src[ 37 ] );
				dst[ 51 ] = decodeFloat16( src[ 47 ] );
				dst[ 52 ] = decodeFloat16( src[ 50 ] );
				dst[ 53 ] = decodeFloat16( src[ 56 ] );
				dst[ 54 ] = decodeFloat16( src[ 59 ] );
				dst[ 55 ] = decodeFloat16( src[ 61 ] );
				dst[ 56 ] = decodeFloat16( src[ 35 ] );
				dst[ 57 ] = decodeFloat16( src[ 36 ] );
				dst[ 58 ] = decodeFloat16( src[ 48 ] );
				dst[ 59 ] = decodeFloat16( src[ 49 ] );
				dst[ 60 ] = decodeFloat16( src[ 57 ] );
				dst[ 61 ] = decodeFloat16( src[ 58 ] );
				dst[ 62 ] = decodeFloat16( src[ 62 ] );
				dst[ 63 ] = decodeFloat16( src[ 63 ] );

			}

			function dctInverse( data ) {

				const a = 0.5 * Math.cos( 3.14159 / 4.0 );
				const b = 0.5 * Math.cos( 3.14159 / 16.0 );
				const c = 0.5 * Math.cos( 3.14159 / 8.0 );
				const d = 0.5 * Math.cos( 3.0 * 3.14159 / 16.0 );
				const e = 0.5 * Math.cos( 5.0 * 3.14159 / 16.0 );
				const f = 0.5 * Math.cos( 3.0 * 3.14159 / 8.0 );
				const g = 0.5 * Math.cos( 7.0 * 3.14159 / 16.0 );
				var alpha = new Array( 4 );
				var beta = new Array( 4 );
				var theta = new Array( 4 );
				var gamma = new Array( 4 );

				for ( var row = 0; row < 8; ++ row ) {

					var rowPtr = row * 8;
					alpha[ 0 ] = c * data[ rowPtr + 2 ];
					alpha[ 1 ] = f * data[ rowPtr + 2 ];
					alpha[ 2 ] = c * data[ rowPtr + 6 ];
					alpha[ 3 ] = f * data[ rowPtr + 6 ];
					beta[ 0 ] = b * data[ rowPtr + 1 ] + d * data[ rowPtr + 3 ] + e * data[ rowPtr + 5 ] + g * data[ rowPtr + 7 ];
					beta[ 1 ] = d * data[ rowPtr + 1 ] - g * data[ rowPtr + 3 ] - b * data[ rowPtr + 5 ] - e * data[ rowPtr + 7 ];
					beta[ 2 ] = e * data[ rowPtr + 1 ] - b * data[ rowPtr + 3 ] + g * data[ rowPtr + 5 ] + d * data[ rowPtr + 7 ];
					beta[ 3 ] = g * data[ rowPtr + 1 ] - e * data[ rowPtr + 3 ] + d * data[ rowPtr + 5 ] - b * data[ rowPtr + 7 ];
					theta[ 0 ] = a * ( data[ rowPtr + 0 ] + data[ rowPtr + 4 ] );
					theta[ 3 ] = a * ( data[ rowPtr + 0 ] - data[ rowPtr + 4 ] );
					theta[ 1 ] = alpha[ 0 ] + alpha[ 3 ];
					theta[ 2 ] = alpha[ 1 ] - alpha[ 2 ];
					gamma[ 0 ] = theta[ 0 ] + theta[ 1 ];
					gamma[ 1 ] = theta[ 3 ] + theta[ 2 ];
					gamma[ 2 ] = theta[ 3 ] - theta[ 2 ];
					gamma[ 3 ] = theta[ 0 ] - theta[ 1 ];
					data[ rowPtr + 0 ] = gamma[ 0 ] + beta[ 0 ];
					data[ rowPtr + 1 ] = gamma[ 1 ] + beta[ 1 ];
					data[ rowPtr + 2 ] = gamma[ 2 ] + beta[ 2 ];
					data[ rowPtr + 3 ] = gamma[ 3 ] + beta[ 3 ];
					data[ rowPtr + 4 ] = gamma[ 3 ] - beta[ 3 ];
					data[ rowPtr + 5 ] = gamma[ 2 ] - beta[ 2 ];
					data[ rowPtr + 6 ] = gamma[ 1 ] - beta[ 1 ];
					data[ rowPtr + 7 ] = gamma[ 0 ] - beta[ 0 ];

				}

				for ( var column = 0; column < 8; ++ column ) {

					alpha[ 0 ] = c * data[ 16 + column ];
					alpha[ 1 ] = f * data[ 16 + column ];
					alpha[ 2 ] = c * data[ 48 + column ];
					alpha[ 3 ] = f * data[ 48 + column ];
					beta[ 0 ] = b * data[ 8 + column ] + d * data[ 24 + column ] + e * data[ 40 + column ] + g * data[ 56 + column ];
					beta[ 1 ] = d * data[ 8 + column ] - g * data[ 24 + column ] - b * data[ 40 + column ] - e * data[ 56 + column ];
					beta[ 2 ] = e * data[ 8 + column ] - b * data[ 24 + column ] + g * data[ 40 + column ] + d * data[ 56 + column ];
					beta[ 3 ] = g * data[ 8 + column ] - e * data[ 24 + column ] + d * data[ 40 + column ] - b * data[ 56 + column ];
					theta[ 0 ] = a * ( data[ column ] + data[ 32 + column ] );
					theta[ 3 ] = a * ( data[ column ] - data[ 32 + column ] );
					theta[ 1 ] = alpha[ 0 ] + alpha[ 3 ];
					theta[ 2 ] = alpha[ 1 ] - alpha[ 2 ];
					gamma[ 0 ] = theta[ 0 ] + theta[ 1 ];
					gamma[ 1 ] = theta[ 3 ] + theta[ 2 ];
					gamma[ 2 ] = theta[ 3 ] - theta[ 2 ];
					gamma[ 3 ] = theta[ 0 ] - theta[ 1 ];
					data[ 0 + column ] = gamma[ 0 ] + beta[ 0 ];
					data[ 8 + column ] = gamma[ 1 ] + beta[ 1 ];
					data[ 16 + column ] = gamma[ 2 ] + beta[ 2 ];
					data[ 24 + column ] = gamma[ 3 ] + beta[ 3 ];
					data[ 32 + column ] = gamma[ 3 ] - beta[ 3 ];
					data[ 40 + column ] = gamma[ 2 ] - beta[ 2 ];
					data[ 48 + column ] = gamma[ 1 ] - beta[ 1 ];
					data[ 56 + column ] = gamma[ 0 ] - beta[ 0 ];

				}

			}

			function csc709Inverse( data ) {

				for ( var i = 0; i < 64; ++ i ) {

					var y = data[ 0 ][ i ];
					var cb = data[ 1 ][ i ];
					var cr = data[ 2 ][ i ];
					data[ 0 ][ i ] = y + 1.5747 * cr;
					data[ 1 ][ i ] = y - 0.1873 * cb - 0.4682 * cr;
					data[ 2 ][ i ] = y + 1.8556 * cb;

				}

			}

			function convertToHalf( src, dst, idx ) {

				for ( var i = 0; i < 64; ++ i ) {

					dst[ idx + i ] = THREE.DataUtils.toHalfFloat( toLinear( src[ i ] ) );

				}

			}

			function toLinear( float ) {

				if ( float <= 1 ) {

					return Math.sign( float ) * Math.pow( Math.abs( float ), 2.2 );

				} else {

					return Math.sign( float ) * Math.pow( logBase, Math.abs( float ) - 1.0 );

				}

			}

			function uncompressRAW( info ) {

				return new DataView( info.array.buffer, info.offset.value, info.size );

			}

			function uncompressRLE( info ) {

				var compressed = info.viewer.buffer.slice( info.offset.value, info.offset.value + info.size );
				var rawBuffer = new Uint8Array( decodeRunLength( compressed ) );
				var tmpBuffer = new Uint8Array( rawBuffer.length );
				predictor( rawBuffer ); // revert predictor

				interleaveScalar( rawBuffer, tmpBuffer ); // interleave pixels

				return new DataView( tmpBuffer.buffer );

			}

			function uncompressZIP( info ) {

				var compressed = info.array.slice( info.offset.value, info.offset.value + info.size );

				if ( typeof fflate === 'undefined' ) {

					console.error( 'THREE.EXRLoader: External library fflate.min.js required.' );

				}

				var rawBuffer = fflate.unzlibSync( compressed ); // eslint-disable-line no-undef

				var tmpBuffer = new Uint8Array( rawBuffer.length );
				predictor( rawBuffer ); // revert predictor

				interleaveScalar( rawBuffer, tmpBuffer ); // interleave pixels

				return new DataView( tmpBuffer.buffer );

			}

			function uncompressPIZ( info ) {

				var inDataView = info.viewer;
				var inOffset = {
					value: info.offset.value
				};
				var tmpBufSize = info.width * scanlineBlockSize * ( EXRHeader.channels.length * info.type );
				var outBuffer = new Uint16Array( tmpBufSize );
				var bitmap = new Uint8Array( BITMAP_SIZE ); // Setup channel info

				var outBufferEnd = 0;
				var pizChannelData = new Array( info.channels );

				for ( var i = 0; i < info.channels; i ++ ) {

					pizChannelData[ i ] = {};
					pizChannelData[ i ][ 'start' ] = outBufferEnd;
					pizChannelData[ i ][ 'end' ] = pizChannelData[ i ][ 'start' ];
					pizChannelData[ i ][ 'nx' ] = info.width;
					pizChannelData[ i ][ 'ny' ] = info.lines;
					pizChannelData[ i ][ 'size' ] = info.type;
					outBufferEnd += pizChannelData[ i ].nx * pizChannelData[ i ].ny * pizChannelData[ i ].size;

				} // Read range compression data


				var minNonZero = parseUint16( inDataView, inOffset );
				var maxNonZero = parseUint16( inDataView, inOffset );

				if ( maxNonZero >= BITMAP_SIZE ) {

					throw 'Something is wrong with PIZ_COMPRESSION BITMAP_SIZE';

				}

				if ( minNonZero <= maxNonZero ) {

					for ( var i = 0; i < maxNonZero - minNonZero + 1; i ++ ) {

						bitmap[ i + minNonZero ] = parseUint8( inDataView, inOffset );

					}

				} // Reverse LUT


				var lut = new Uint16Array( USHORT_RANGE );
				var maxValue = reverseLutFromBitmap( bitmap, lut );
				var length = parseUint32( inDataView, inOffset ); // Huffman decoding

				hufUncompress( info.array, inDataView, inOffset, length, outBuffer, outBufferEnd ); // Wavelet decoding

				for ( var i = 0; i < info.channels; ++ i ) {

					var cd = pizChannelData[ i ];

					for ( var j = 0; j < pizChannelData[ i ].size; ++ j ) {

						wav2Decode( outBuffer, cd.start + j, cd.nx, cd.size, cd.ny, cd.nx * cd.size, maxValue );

					}

				} // Expand the pixel data to their original range


				applyLut( lut, outBuffer, outBufferEnd ); // Rearrange the pixel data into the format expected by the caller.

				var tmpOffset = 0;
				var tmpBuffer = new Uint8Array( outBuffer.buffer.byteLength );

				for ( var y = 0; y < info.lines; y ++ ) {

					for ( var c = 0; c < info.channels; c ++ ) {

						var cd = pizChannelData[ c ];
						var n = cd.nx * cd.size;
						var cp = new Uint8Array( outBuffer.buffer, cd.end * INT16_SIZE, n * INT16_SIZE );
						tmpBuffer.set( cp, tmpOffset );
						tmpOffset += n * INT16_SIZE;
						cd.end += n;

					}

				}

				return new DataView( tmpBuffer.buffer );

			}

			function uncompressPXR( info ) {

				var compressed = info.array.slice( info.offset.value, info.offset.value + info.size );

				if ( typeof fflate === 'undefined' ) {

					console.error( 'THREE.EXRLoader: External library fflate.min.js required.' );

				}

				var rawBuffer = fflate.unzlibSync( compressed ); // eslint-disable-line no-undef

				const sz = info.lines * info.channels * info.width;
				const tmpBuffer = info.type == 1 ? new Uint16Array( sz ) : new Uint32Array( sz );
				let tmpBufferEnd = 0;
				let writePtr = 0;
				const ptr = new Array( 4 );

				for ( let y = 0; y < info.lines; y ++ ) {

					for ( let c = 0; c < info.channels; c ++ ) {

						let pixel = 0;

						switch ( info.type ) {

							case 1:
								ptr[ 0 ] = tmpBufferEnd;
								ptr[ 1 ] = ptr[ 0 ] + info.width;
								tmpBufferEnd = ptr[ 1 ] + info.width;

								for ( let j = 0; j < info.width; ++ j ) {

									const diff = rawBuffer[ ptr[ 0 ] ++ ] << 8 | rawBuffer[ ptr[ 1 ] ++ ];
									pixel += diff;
									tmpBuffer[ writePtr ] = pixel;
									writePtr ++;

								}

								break;

							case 2:
								ptr[ 0 ] = tmpBufferEnd;
								ptr[ 1 ] = ptr[ 0 ] + info.width;
								ptr[ 2 ] = ptr[ 1 ] + info.width;
								tmpBufferEnd = ptr[ 2 ] + info.width;

								for ( let j = 0; j < info.width; ++ j ) {

									const diff = rawBuffer[ ptr[ 0 ] ++ ] << 24 | rawBuffer[ ptr[ 1 ] ++ ] << 16 | rawBuffer[ ptr[ 2 ] ++ ] << 8;
									pixel += diff;
									tmpBuffer[ writePtr ] = pixel;
									writePtr ++;

								}

								break;

						}

					}

				}

				return new DataView( tmpBuffer.buffer );

			}

			function uncompressDWA( info ) {

				var inDataView = info.viewer;
				var inOffset = {
					value: info.offset.value
				};
				var outBuffer = new Uint8Array( info.width * info.lines * ( EXRHeader.channels.length * info.type * INT16_SIZE ) ); // Read compression header information

				var dwaHeader = {
					version: parseInt64( inDataView, inOffset ),
					unknownUncompressedSize: parseInt64( inDataView, inOffset ),
					unknownCompressedSize: parseInt64( inDataView, inOffset ),
					acCompressedSize: parseInt64( inDataView, inOffset ),
					dcCompressedSize: parseInt64( inDataView, inOffset ),
					rleCompressedSize: parseInt64( inDataView, inOffset ),
					rleUncompressedSize: parseInt64( inDataView, inOffset ),
					rleRawSize: parseInt64( inDataView, inOffset ),
					totalAcUncompressedCount: parseInt64( inDataView, inOffset ),
					totalDcUncompressedCount: parseInt64( inDataView, inOffset ),
					acCompression: parseInt64( inDataView, inOffset )
				};
				if ( dwaHeader.version < 2 ) throw 'EXRLoader.parse: ' + EXRHeader.compression + ' version ' + dwaHeader.version + ' is unsupported'; // Read channel ruleset information

				var channelRules = new Array();
				var ruleSize = parseUint16( inDataView, inOffset ) - INT16_SIZE;

				while ( ruleSize > 0 ) {

					var name = parseNullTerminatedString( inDataView.buffer, inOffset );
					var value = parseUint8( inDataView, inOffset );
					var compression = value >> 2 & 3;
					var csc = ( value >> 4 ) - 1;
					var index = new Int8Array( [ csc ] )[ 0 ];
					var type = parseUint8( inDataView, inOffset );
					channelRules.push( {
						name: name,
						index: index,
						type: type,
						compression: compression
					} );
					ruleSize -= name.length + 3;

				} // Classify channels


				var channels = EXRHeader.channels;
				var channelData = new Array( info.channels );

				for ( var i = 0; i < info.channels; ++ i ) {

					var cd = channelData[ i ] = {};
					var channel = channels[ i ];
					cd.name = channel.name;
					cd.compression = UNKNOWN;
					cd.decoded = false;
					cd.type = channel.pixelType;
					cd.pLinear = channel.pLinear;
					cd.width = info.width;
					cd.height = info.lines;

				}

				var cscSet = {
					idx: new Array( 3 )
				};

				for ( var offset = 0; offset < info.channels; ++ offset ) {

					var cd = channelData[ offset ];

					for ( var i = 0; i < channelRules.length; ++ i ) {

						var rule = channelRules[ i ];

						if ( cd.name == rule.name ) {

							cd.compression = rule.compression;

							if ( rule.index >= 0 ) {

								cscSet.idx[ rule.index ] = offset;

							}

							cd.offset = offset;

						}

					}

				} // Read DCT - AC component data


				if ( dwaHeader.acCompressedSize > 0 ) {

					switch ( dwaHeader.acCompression ) {

						case STATIC_HUFFMAN:
							var acBuffer = new Uint16Array( dwaHeader.totalAcUncompressedCount );
							hufUncompress( info.array, inDataView, inOffset, dwaHeader.acCompressedSize, acBuffer, dwaHeader.totalAcUncompressedCount );
							break;

						case DEFLATE:
							var compressed = info.array.slice( inOffset.value, inOffset.value + dwaHeader.totalAcUncompressedCount );
							var data = fflate.unzlibSync( compressed ); // eslint-disable-line no-undef

							var acBuffer = new Uint16Array( data.buffer );
							inOffset.value += dwaHeader.totalAcUncompressedCount;
							break;

					}

				} // Read DCT - DC component data


				if ( dwaHeader.dcCompressedSize > 0 ) {

					var zlibInfo = {
						array: info.array,
						offset: inOffset,
						size: dwaHeader.dcCompressedSize
					};
					var dcBuffer = new Uint16Array( uncompressZIP( zlibInfo ).buffer );
					inOffset.value += dwaHeader.dcCompressedSize;

				} // Read RLE compressed data


				if ( dwaHeader.rleRawSize > 0 ) {

					var compressed = info.array.slice( inOffset.value, inOffset.value + dwaHeader.rleCompressedSize );
					var data = fflate.unzlibSync( compressed ); // eslint-disable-line no-undef

					var rleBuffer = decodeRunLength( data.buffer );
					inOffset.value += dwaHeader.rleCompressedSize;

				} // Prepare outbuffer data offset


				var outBufferEnd = 0;
				var rowOffsets = new Array( channelData.length );

				for ( var i = 0; i < rowOffsets.length; ++ i ) {

					rowOffsets[ i ] = new Array();

				}

				for ( var y = 0; y < info.lines; ++ y ) {

					for ( var chan = 0; chan < channelData.length; ++ chan ) {

						rowOffsets[ chan ].push( outBufferEnd );
						outBufferEnd += channelData[ chan ].width * info.type * INT16_SIZE;

					}

				} // Lossy DCT decode RGB channels


				lossyDctDecode( cscSet, rowOffsets, channelData, acBuffer, dcBuffer, outBuffer ); // Decode other channels

				for ( var i = 0; i < channelData.length; ++ i ) {

					var cd = channelData[ i ];
					if ( cd.decoded ) continue;

					switch ( cd.compression ) {

						case RLE:
							var row = 0;
							var rleOffset = 0;

							for ( var y = 0; y < info.lines; ++ y ) {

								var rowOffsetBytes = rowOffsets[ i ][ row ];

								for ( var x = 0; x < cd.width; ++ x ) {

									for ( var byte = 0; byte < INT16_SIZE * cd.type; ++ byte ) {

										outBuffer[ rowOffsetBytes ++ ] = rleBuffer[ rleOffset + byte * cd.width * cd.height ];

									}

									rleOffset ++;

								}

								row ++;

							}

							break;

						case LOSSY_DCT: // skip

						default:
							throw 'EXRLoader.parse: unsupported channel compression';

					}

				}

				return new DataView( outBuffer.buffer );

			}

			function parseNullTerminatedString( buffer, offset ) {

				var uintBuffer = new Uint8Array( buffer );
				var endOffset = 0;

				while ( uintBuffer[ offset.value + endOffset ] != 0 ) {

					endOffset += 1;

				}

				var stringValue = new TextDecoder().decode( uintBuffer.slice( offset.value, offset.value + endOffset ) );
				offset.value = offset.value + endOffset + 1;
				return stringValue;

			}

			function parseFixedLengthString( buffer, offset, size ) {

				var stringValue = new TextDecoder().decode( new Uint8Array( buffer ).slice( offset.value, offset.value + size ) );
				offset.value = offset.value + size;
				return stringValue;

			}

			function parseUlong( dataView, offset ) {

				var uLong = dataView.getUint32( 0, true );
				offset.value = offset.value + ULONG_SIZE;
				return uLong;

			}

			function parseRational( dataView, offset ) {

				var x = parseInt32( dataView, offset );
				var y = parseUint32( dataView, offset );
				return [ x, y ];

			}

			function parseTimecode( dataView, offset ) {

				var x = parseUint32( dataView, offset );
				var y = parseUint32( dataView, offset );
				return [ x, y ];

			}

			function parseInt32( dataView, offset ) {

				var Int32 = dataView.getInt32( offset.value, true );
				offset.value = offset.value + INT32_SIZE;
				return Int32;

			}

			function parseUint32( dataView, offset ) {

				var Uint32 = dataView.getUint32( offset.value, true );
				offset.value = offset.value + INT32_SIZE;
				return Uint32;

			}

			function parseUint8Array( uInt8Array, offset ) {

				var Uint8 = uInt8Array[ offset.value ];
				offset.value = offset.value + INT8_SIZE;
				return Uint8;

			}

			function parseUint8( dataView, offset ) {

				var Uint8 = dataView.getUint8( offset.value );
				offset.value = offset.value + INT8_SIZE;
				return Uint8;

			}

			function parseInt64( dataView, offset ) {

				var int = Number( dataView.getBigInt64( offset.value, true ) );
				offset.value += ULONG_SIZE;
				return int;

			}

			function parseFloat32( dataView, offset ) {

				var float = dataView.getFloat32( offset.value, true );
				offset.value += FLOAT32_SIZE;
				return float;

			}

			function decodeFloat32( dataView, offset ) {

				return THREE.DataUtils.toHalfFloat( parseFloat32( dataView, offset ) );

			} // https://stackoverflow.com/questions/5678432/decompressing-half-precision-floats-in-javascript


			function decodeFloat16( binary ) {

				var exponent = ( binary & 0x7C00 ) >> 10,
					fraction = binary & 0x03FF;
				return ( binary >> 15 ? - 1 : 1 ) * ( exponent ? exponent === 0x1F ? fraction ? NaN : Infinity : Math.pow( 2, exponent - 15 ) * ( 1 + fraction / 0x400 ) : 6.103515625e-5 * ( fraction / 0x400 ) );

			}

			function parseUint16( dataView, offset ) {

				var Uint16 = dataView.getUint16( offset.value, true );
				offset.value += INT16_SIZE;
				return Uint16;

			}

			function parseFloat16( buffer, offset ) {

				return decodeFloat16( parseUint16( buffer, offset ) );

			}

			function parseChlist( dataView, buffer, offset, size ) {

				var startOffset = offset.value;
				var channels = [];

				while ( offset.value < startOffset + size - 1 ) {

					var name = parseNullTerminatedString( buffer, offset );
					var pixelType = parseInt32( dataView, offset );
					var pLinear = parseUint8( dataView, offset );
					offset.value += 3; // reserved, three chars

					var xSampling = parseInt32( dataView, offset );
					var ySampling = parseInt32( dataView, offset );
					channels.push( {
						name: name,
						pixelType: pixelType,
						pLinear: pLinear,
						xSampling: xSampling,
						ySampling: ySampling
					} );

				}

				offset.value += 1;
				return channels;

			}

			function parseChromaticities( dataView, offset ) {

				var redX = parseFloat32( dataView, offset );
				var redY = parseFloat32( dataView, offset );
				var greenX = parseFloat32( dataView, offset );
				var greenY = parseFloat32( dataView, offset );
				var blueX = parseFloat32( dataView, offset );
				var blueY = parseFloat32( dataView, offset );
				var whiteX = parseFloat32( dataView, offset );
				var whiteY = parseFloat32( dataView, offset );
				return {
					redX: redX,
					redY: redY,
					greenX: greenX,
					greenY: greenY,
					blueX: blueX,
					blueY: blueY,
					whiteX: whiteX,
					whiteY: whiteY
				};

			}

			function parseCompression( dataView, offset ) {

				var compressionCodes = [ 'NO_COMPRESSION', 'RLE_COMPRESSION', 'ZIPS_COMPRESSION', 'ZIP_COMPRESSION', 'PIZ_COMPRESSION', 'PXR24_COMPRESSION', 'B44_COMPRESSION', 'B44A_COMPRESSION', 'DWAA_COMPRESSION', 'DWAB_COMPRESSION' ];
				var compression = parseUint8( dataView, offset );
				return compressionCodes[ compression ];

			}

			function parseBox2i( dataView, offset ) {

				var xMin = parseUint32( dataView, offset );
				var yMin = parseUint32( dataView, offset );
				var xMax = parseUint32( dataView, offset );
				var yMax = parseUint32( dataView, offset );
				return {
					xMin: xMin,
					yMin: yMin,
					xMax: xMax,
					yMax: yMax
				};

			}

			function parseLineOrder( dataView, offset ) {

				var lineOrders = [ 'INCREASING_Y' ];
				var lineOrder = parseUint8( dataView, offset );
				return lineOrders[ lineOrder ];

			}

			function parseV2f( dataView, offset ) {

				var x = parseFloat32( dataView, offset );
				var y = parseFloat32( dataView, offset );
				return [ x, y ];

			}

			function parseV3f( dataView, offset ) {

				var x = parseFloat32( dataView, offset );
				var y = parseFloat32( dataView, offset );
				var z = parseFloat32( dataView, offset );
				return [ x, y, z ];

			}

			function parseValue( dataView, buffer, offset, type, size ) {

				if ( type === 'string' || type === 'stringvector' || type === 'iccProfile' ) {

					return parseFixedLengthString( buffer, offset, size );

				} else if ( type === 'chlist' ) {

					return parseChlist( dataView, buffer, offset, size );

				} else if ( type === 'chromaticities' ) {

					return parseChromaticities( dataView, offset );

				} else if ( type === 'compression' ) {

					return parseCompression( dataView, offset );

				} else if ( type === 'box2i' ) {

					return parseBox2i( dataView, offset );

				} else if ( type === 'lineOrder' ) {

					return parseLineOrder( dataView, offset );

				} else if ( type === 'float' ) {

					return parseFloat32( dataView, offset );

				} else if ( type === 'v2f' ) {

					return parseV2f( dataView, offset );

				} else if ( type === 'v3f' ) {

					return parseV3f( dataView, offset );

				} else if ( type === 'int' ) {

					return parseInt32( dataView, offset );

				} else if ( type === 'rational' ) {

					return parseRational( dataView, offset );

				} else if ( type === 'timecode' ) {

					return parseTimecode( dataView, offset );

				} else if ( type === 'preview' ) {

					offset.value += size;
					return 'skipped';

				} else {

					offset.value += size;
					return undefined;

				}

			}

			var bufferDataView = new DataView( buffer );
			var uInt8Array = new Uint8Array( buffer );
			var EXRHeader = {};
			bufferDataView.getUint32( 0, true ); // magic

			bufferDataView.getUint8( 4, true ); // versionByteZero

			bufferDataView.getUint8( 5, true ); // fullMask
			// start of header

			var offset = {
				value: 8
			}; // start at 8, after magic stuff

			var keepReading = true;

			while ( keepReading ) {

				var attributeName = parseNullTerminatedString( buffer, offset );

				if ( attributeName == 0 ) {

					keepReading = false;

				} else {

					var attributeType = parseNullTerminatedString( buffer, offset );
					var attributeSize = parseUint32( bufferDataView, offset );
					var attributeValue = parseValue( bufferDataView, buffer, offset, attributeType, attributeSize );

					if ( attributeValue === undefined ) {

						console.warn( `EXRLoader.parse: skipped unknown header attribute type \'${attributeType}\'.` );

					} else {

						EXRHeader[ attributeName ] = attributeValue;

					}

				}

			} // offsets


			var dataWindowHeight = EXRHeader.dataWindow.yMax + 1;
			var uncompress;
			var scanlineBlockSize;

			switch ( EXRHeader.compression ) {

				case 'NO_COMPRESSION':
					scanlineBlockSize = 1;
					uncompress = uncompressRAW;
					break;

				case 'RLE_COMPRESSION':
					scanlineBlockSize = 1;
					uncompress = uncompressRLE;
					break;

				case 'ZIPS_COMPRESSION':
					scanlineBlockSize = 1;
					uncompress = uncompressZIP;
					break;

				case 'ZIP_COMPRESSION':
					scanlineBlockSize = 16;
					uncompress = uncompressZIP;
					break;

				case 'PIZ_COMPRESSION':
					scanlineBlockSize = 32;
					uncompress = uncompressPIZ;
					break;

				case 'PXR24_COMPRESSION':
					scanlineBlockSize = 16;
					uncompress = uncompressPXR;
					break;

				case 'DWAA_COMPRESSION':
					scanlineBlockSize = 32;
					uncompress = uncompressDWA;
					break;

				case 'DWAB_COMPRESSION':
					scanlineBlockSize = 256;
					uncompress = uncompressDWA;
					break;

				default:
					throw 'EXRLoader.parse: ' + EXRHeader.compression + ' is unsupported';

			}

			var size_t;
			var getValue; // mixed pixelType not supported

			var pixelType = EXRHeader.channels[ 0 ].pixelType;

			if ( pixelType === 1 ) {

				// half
				switch ( this.type ) {

					case THREE.UnsignedByteType:
					case THREE.FloatType:
						getValue = parseFloat16;
						size_t = INT16_SIZE;
						break;

					case THREE.HalfFloatType:
						getValue = parseUint16;
						size_t = INT16_SIZE;
						break;

				}

			} else if ( pixelType === 2 ) {

				// float
				switch ( this.type ) {

					case THREE.UnsignedByteType:
					case THREE.FloatType:
						getValue = parseFloat32;
						size_t = FLOAT32_SIZE;
						break;

					case THREE.HalfFloatType:
						getValue = decodeFloat32;
						size_t = FLOAT32_SIZE;

				}

			} else {

				throw 'EXRLoader.parse: unsupported pixelType ' + pixelType + ' for ' + EXRHeader.compression + '.';

			}

			var numBlocks = dataWindowHeight / scanlineBlockSize;

			for ( var i = 0; i < numBlocks; i ++ ) {

				parseUlong( bufferDataView, offset ); // scanlineOffset

			} // we should be passed the scanline offset table, start reading pixel data


			var width = EXRHeader.dataWindow.xMax - EXRHeader.dataWindow.xMin + 1;
			var height = EXRHeader.dataWindow.yMax - EXRHeader.dataWindow.yMin + 1; // Firefox only supports RGBA (half) float textures
			// var numChannels = EXRHeader.channels.length;

			var numChannels = 4;
			var size = width * height * numChannels; // Fill initially with 1s for the alpha value if the texture is not RGBA, RGB values will be overwritten

			switch ( this.type ) {

				case THREE.UnsignedByteType:
				case THREE.FloatType:
					var byteArray = new Float32Array( size );

					if ( EXRHeader.channels.length < numChannels ) {

						byteArray.fill( 1, 0, size );

					}

					break;

				case THREE.HalfFloatType:
					var byteArray = new Uint16Array( size );

					if ( EXRHeader.channels.length < numChannels ) {

						byteArray.fill( 0x3C00, 0, size ); // Uint16Array holds half float data, 0x3C00 is 1

					}

					break;

				default:
					console.error( 'THREE.EXRLoader: unsupported type: ', this.type );
					break;

			}

			var channelOffsets = {
				R: 0,
				G: 1,
				B: 2,
				A: 3
			};
			var compressionInfo = {
				size: 0,
				width: width,
				lines: scanlineBlockSize,
				offset: offset,
				array: uInt8Array,
				viewer: bufferDataView,
				type: pixelType,
				channels: EXRHeader.channels.length
			};
			var line;
			var size;
			var viewer;
			var tmpOffset = {
				value: 0
			};

			for ( var scanlineBlockIdx = 0; scanlineBlockIdx < height / scanlineBlockSize; scanlineBlockIdx ++ ) {

				line = parseUint32( bufferDataView, offset ); // line_no

				size = parseUint32( bufferDataView, offset ); // data_len

				compressionInfo.lines = line + scanlineBlockSize > height ? height - line : scanlineBlockSize;
				compressionInfo.offset = offset;
				compressionInfo.size = size;
				viewer = uncompress( compressionInfo );
				offset.value += size;

				for ( var line_y = 0; line_y < scanlineBlockSize; line_y ++ ) {

					var true_y = line_y + scanlineBlockIdx * scanlineBlockSize;
					if ( true_y >= height ) break;

					for ( var channelID = 0; channelID < EXRHeader.channels.length; channelID ++ ) {

						var cOff = channelOffsets[ EXRHeader.channels[ channelID ].name ];

						for ( var x = 0; x < width; x ++ ) {

							var idx = line_y * ( EXRHeader.channels.length * width ) + channelID * width + x;
							tmpOffset.value = idx * size_t;
							var val = getValue( viewer, tmpOffset );
							byteArray[ ( height - 1 - true_y ) * ( width * numChannels ) + x * numChannels + cOff ] = val;

						}

					}

				}

			}

			if ( this.type === THREE.UnsignedByteType ) {

				let v, i;
				const size = byteArray.length;
				const RGBEArray = new Uint8Array( size );

				for ( let h = 0; h < height; ++ h ) {

					for ( let w = 0; w < width; ++ w ) {

						i = h * width * 4 + w * 4;
						const red = byteArray[ i ];
						const green = byteArray[ i + 1 ];
						const blue = byteArray[ i + 2 ];
						v = red > green ? red : green;
						v = blue > v ? blue : v;

						if ( v < 1e-32 ) {

							RGBEArray[ i ] = RGBEArray[ i + 1 ] = RGBEArray[ i + 2 ] = RGBEArray[ i + 3 ] = 0;

						} else {

							const res = frexp( v );
							v = res[ 0 ] * 256 / v;
							RGBEArray[ i ] = red * v;
							RGBEArray[ i + 1 ] = green * v;
							RGBEArray[ i + 2 ] = blue * v;
							RGBEArray[ i + 3 ] = res[ 1 ] + 128;

						}

					}

				}

				byteArray = RGBEArray;

			}

			const format = this.type === THREE.UnsignedByteType ? THREE.RGBEFormat : numChannels === 4 ? THREE.RGBAFormat : THREE.RGBFormat;
			return {
				header: EXRHeader,
				width: width,
				height: height,
				data: byteArray,
				format: format,
				type: this.type
			};

		}

		setDataType( value ) {

			this.type = value;
			return this;

		}

		load( url, onLoad, onProgress, onError ) {

			function onLoadCallback( texture, texData ) {

				switch ( texture.type ) {

					case THREE.UnsignedByteType:
						texture.encoding = THREE.RGBEEncoding;
						texture.minFilter = THREE.NearestFilter;
						texture.magFilter = THREE.NearestFilter;
						texture.generateMipmaps = false;
						texture.flipY = false;
						break;

					case THREE.FloatType:
					case THREE.HalfFloatType:
						texture.encoding = THREE.LinearEncoding;
						texture.minFilter = THREE.LinearFilter;
						texture.magFilter = THREE.LinearFilter;
						texture.generateMipmaps = false;
						texture.flipY = false;
						break;

				}

				if ( onLoad ) onLoad( texture, texData );

			}

			return super.load( url, onLoadCallback, onProgress, onError );

		}

	}

	THREE.EXRLoader = EXRLoader;

} )();

;/* ---- math/SimplexNoise.js ---- */
( function () {

	// Ported from Stefan Gustavson's java implementation
	// http://staffwww.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf
	// Read Stefan's excellent paper for details on how this code works.
	//
	// Sean McCullough banksean@gmail.com
	//
	// Added 4D noise

	/**
 * You can pass in a random number generator object if you like.
 * It is assumed to have a random() method.
 */
	class SimplexNoise {

		constructor( r = Math ) {

			this.grad3 = [[ 1, 1, 0 ], [ - 1, 1, 0 ], [ 1, - 1, 0 ], [ - 1, - 1, 0 ], [ 1, 0, 1 ], [ - 1, 0, 1 ], [ 1, 0, - 1 ], [ - 1, 0, - 1 ], [ 0, 1, 1 ], [ 0, - 1, 1 ], [ 0, 1, - 1 ], [ 0, - 1, - 1 ]];
			this.grad4 = [[ 0, 1, 1, 1 ], [ 0, 1, 1, - 1 ], [ 0, 1, - 1, 1 ], [ 0, 1, - 1, - 1 ], [ 0, - 1, 1, 1 ], [ 0, - 1, 1, - 1 ], [ 0, - 1, - 1, 1 ], [ 0, - 1, - 1, - 1 ], [ 1, 0, 1, 1 ], [ 1, 0, 1, - 1 ], [ 1, 0, - 1, 1 ], [ 1, 0, - 1, - 1 ], [ - 1, 0, 1, 1 ], [ - 1, 0, 1, - 1 ], [ - 1, 0, - 1, 1 ], [ - 1, 0, - 1, - 1 ], [ 1, 1, 0, 1 ], [ 1, 1, 0, - 1 ], [ 1, - 1, 0, 1 ], [ 1, - 1, 0, - 1 ], [ - 1, 1, 0, 1 ], [ - 1, 1, 0, - 1 ], [ - 1, - 1, 0, 1 ], [ - 1, - 1, 0, - 1 ], [ 1, 1, 1, 0 ], [ 1, 1, - 1, 0 ], [ 1, - 1, 1, 0 ], [ 1, - 1, - 1, 0 ], [ - 1, 1, 1, 0 ], [ - 1, 1, - 1, 0 ], [ - 1, - 1, 1, 0 ], [ - 1, - 1, - 1, 0 ]];
			this.p = [];

			for ( let i = 0; i < 256; i ++ ) {

				this.p[ i ] = Math.floor( r.random() * 256 );

			} // To remove the need for index wrapping, double the permutation table length


			this.perm = [];

			for ( let i = 0; i < 512; i ++ ) {

				this.perm[ i ] = this.p[ i & 255 ];

			} // A lookup table to traverse the simplex around a given point in 4D.
			// Details can be found where this table is used, in the 4D noise method.


			this.simplex = [[ 0, 1, 2, 3 ], [ 0, 1, 3, 2 ], [ 0, 0, 0, 0 ], [ 0, 2, 3, 1 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 1, 2, 3, 0 ], [ 0, 2, 1, 3 ], [ 0, 0, 0, 0 ], [ 0, 3, 1, 2 ], [ 0, 3, 2, 1 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 1, 3, 2, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 1, 2, 0, 3 ], [ 0, 0, 0, 0 ], [ 1, 3, 0, 2 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 2, 3, 0, 1 ], [ 2, 3, 1, 0 ], [ 1, 0, 2, 3 ], [ 1, 0, 3, 2 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 2, 0, 3, 1 ], [ 0, 0, 0, 0 ], [ 2, 1, 3, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 2, 0, 1, 3 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 3, 0, 1, 2 ], [ 3, 0, 2, 1 ], [ 0, 0, 0, 0 ], [ 3, 1, 2, 0 ], [ 2, 1, 0, 3 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 0, 0, 0, 0 ], [ 3, 1, 0, 2 ], [ 0, 0, 0, 0 ], [ 3, 2, 0, 1 ], [ 3, 2, 1, 0 ]];

		}

		dot( g, x, y ) {

			return g[ 0 ] * x + g[ 1 ] * y;

		}

		dot3( g, x, y, z ) {

			return g[ 0 ] * x + g[ 1 ] * y + g[ 2 ] * z;

		}

		dot4( g, x, y, z, w ) {

			return g[ 0 ] * x + g[ 1 ] * y + g[ 2 ] * z + g[ 3 ] * w;

		}

		noise( xin, yin ) {

			let n0; // Noise contributions from the three corners

			let n1;
			let n2; // Skew the input space to determine which simplex cell we're in

			const F2 = 0.5 * ( Math.sqrt( 3.0 ) - 1.0 );
			const s = ( xin + yin ) * F2; // Hairy factor for 2D

			const i = Math.floor( xin + s );
			const j = Math.floor( yin + s );
			const G2 = ( 3.0 - Math.sqrt( 3.0 ) ) / 6.0;
			const t = ( i + j ) * G2;
			const X0 = i - t; // Unskew the cell origin back to (x,y) space

			const Y0 = j - t;
			const x0 = xin - X0; // The x,y distances from the cell origin

			const y0 = yin - Y0; // For the 2D case, the simplex shape is an equilateral triangle.
			// Determine which simplex we are in.

			let i1; // Offsets for second (middle) corner of simplex in (i,j) coords

			let j1;

			if ( x0 > y0 ) {

				i1 = 1;
				j1 = 0; // lower triangle, XY order: (0,0)->(1,0)->(1,1)

			} else {

				i1 = 0;
				j1 = 1;

			} // upper triangle, YX order: (0,0)->(0,1)->(1,1)
			// A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
			// a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
			// c = (3-sqrt(3))/6


			const x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords

			const y1 = y0 - j1 + G2;
			const x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords

			const y2 = y0 - 1.0 + 2.0 * G2; // Work out the hashed gradient indices of the three simplex corners

			const ii = i & 255;
			const jj = j & 255;
			const gi0 = this.perm[ ii + this.perm[ jj ] ] % 12;
			const gi1 = this.perm[ ii + i1 + this.perm[ jj + j1 ] ] % 12;
			const gi2 = this.perm[ ii + 1 + this.perm[ jj + 1 ] ] % 12; // Calculate the contribution from the three corners

			let t0 = 0.5 - x0 * x0 - y0 * y0;
			if ( t0 < 0 ) n0 = 0.0; else {

				t0 *= t0;
				n0 = t0 * t0 * this.dot( this.grad3[ gi0 ], x0, y0 ); // (x,y) of grad3 used for 2D gradient

			}

			let t1 = 0.5 - x1 * x1 - y1 * y1;
			if ( t1 < 0 ) n1 = 0.0; else {

				t1 *= t1;
				n1 = t1 * t1 * this.dot( this.grad3[ gi1 ], x1, y1 );

			}

			let t2 = 0.5 - x2 * x2 - y2 * y2;
			if ( t2 < 0 ) n2 = 0.0; else {

				t2 *= t2;
				n2 = t2 * t2 * this.dot( this.grad3[ gi2 ], x2, y2 );

			} // Add contributions from each corner to get the final noise value.
			// The result is scaled to return values in the interval [-1,1].

			return 70.0 * ( n0 + n1 + n2 );

		} // 3D simplex noise


		noise3d( xin, yin, zin ) {

			let n0; // Noise contributions from the four corners

			let n1;
			let n2;
			let n3; // Skew the input space to determine which simplex cell we're in

			const F3 = 1.0 / 3.0;
			const s = ( xin + yin + zin ) * F3; // Very nice and simple skew factor for 3D

			const i = Math.floor( xin + s );
			const j = Math.floor( yin + s );
			const k = Math.floor( zin + s );
			const G3 = 1.0 / 6.0; // Very nice and simple unskew factor, too

			const t = ( i + j + k ) * G3;
			const X0 = i - t; // Unskew the cell origin back to (x,y,z) space

			const Y0 = j - t;
			const Z0 = k - t;
			const x0 = xin - X0; // The x,y,z distances from the cell origin

			const y0 = yin - Y0;
			const z0 = zin - Z0; // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
			// Determine which simplex we are in.

			let i1; // Offsets for second corner of simplex in (i,j,k) coords

			let j1;
			let k1;
			let i2; // Offsets for third corner of simplex in (i,j,k) coords

			let j2;
			let k2;

			if ( x0 >= y0 ) {

				if ( y0 >= z0 ) {

					i1 = 1;
					j1 = 0;
					k1 = 0;
					i2 = 1;
					j2 = 1;
					k2 = 0; // X Y Z order

				} else if ( x0 >= z0 ) {

					i1 = 1;
					j1 = 0;
					k1 = 0;
					i2 = 1;
					j2 = 0;
					k2 = 1; // X Z Y order

				} else {

					i1 = 0;
					j1 = 0;
					k1 = 1;
					i2 = 1;
					j2 = 0;
					k2 = 1;

				} // Z X Y order

			} else {

				// x0<y0
				if ( y0 < z0 ) {

					i1 = 0;
					j1 = 0;
					k1 = 1;
					i2 = 0;
					j2 = 1;
					k2 = 1; // Z Y X order

				} else if ( x0 < z0 ) {

					i1 = 0;
					j1 = 1;
					k1 = 0;
					i2 = 0;
					j2 = 1;
					k2 = 1; // Y Z X order

				} else {

					i1 = 0;
					j1 = 1;
					k1 = 0;
					i2 = 1;
					j2 = 1;
					k2 = 0;

				} // Y X Z order

			} // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
			// a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
			// a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
			// c = 1/6.


			const x1 = x0 - i1 + G3; // Offsets for second corner in (x,y,z) coords

			const y1 = y0 - j1 + G3;
			const z1 = z0 - k1 + G3;
			const x2 = x0 - i2 + 2.0 * G3; // Offsets for third corner in (x,y,z) coords

			const y2 = y0 - j2 + 2.0 * G3;
			const z2 = z0 - k2 + 2.0 * G3;
			const x3 = x0 - 1.0 + 3.0 * G3; // Offsets for last corner in (x,y,z) coords

			const y3 = y0 - 1.0 + 3.0 * G3;
			const z3 = z0 - 1.0 + 3.0 * G3; // Work out the hashed gradient indices of the four simplex corners

			const ii = i & 255;
			const jj = j & 255;
			const kk = k & 255;
			const gi0 = this.perm[ ii + this.perm[ jj + this.perm[ kk ] ] ] % 12;
			const gi1 = this.perm[ ii + i1 + this.perm[ jj + j1 + this.perm[ kk + k1 ] ] ] % 12;
			const gi2 = this.perm[ ii + i2 + this.perm[ jj + j2 + this.perm[ kk + k2 ] ] ] % 12;
			const gi3 = this.perm[ ii + 1 + this.perm[ jj + 1 + this.perm[ kk + 1 ] ] ] % 12; // Calculate the contribution from the four corners

			let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
			if ( t0 < 0 ) n0 = 0.0; else {

				t0 *= t0;
				n0 = t0 * t0 * this.dot3( this.grad3[ gi0 ], x0, y0, z0 );

			}

			let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
			if ( t1 < 0 ) n1 = 0.0; else {

				t1 *= t1;
				n1 = t1 * t1 * this.dot3( this.grad3[ gi1 ], x1, y1, z1 );

			}

			let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
			if ( t2 < 0 ) n2 = 0.0; else {

				t2 *= t2;
				n2 = t2 * t2 * this.dot3( this.grad3[ gi2 ], x2, y2, z2 );

			}

			let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
			if ( t3 < 0 ) n3 = 0.0; else {

				t3 *= t3;
				n3 = t3 * t3 * this.dot3( this.grad3[ gi3 ], x3, y3, z3 );

			} // Add contributions from each corner to get the final noise value.
			// The result is scaled to stay just inside [-1,1]

			return 32.0 * ( n0 + n1 + n2 + n3 );

		} // 4D simplex noise


		noise4d( x, y, z, w ) {

			// For faster and easier lookups
			const grad4 = this.grad4;
			const simplex = this.simplex;
			const perm = this.perm; // The skewing and unskewing factors are hairy again for the 4D case

			const F4 = ( Math.sqrt( 5.0 ) - 1.0 ) / 4.0;
			const G4 = ( 5.0 - Math.sqrt( 5.0 ) ) / 20.0;
			let n0; // Noise contributions from the five corners

			let n1;
			let n2;
			let n3;
			let n4; // Skew the (x,y,z,w) space to determine which cell of 24 simplices we're in

			const s = ( x + y + z + w ) * F4; // Factor for 4D skewing

			const i = Math.floor( x + s );
			const j = Math.floor( y + s );
			const k = Math.floor( z + s );
			const l = Math.floor( w + s );
			const t = ( i + j + k + l ) * G4; // Factor for 4D unskewing

			const X0 = i - t; // Unskew the cell origin back to (x,y,z,w) space

			const Y0 = j - t;
			const Z0 = k - t;
			const W0 = l - t;
			const x0 = x - X0; // The x,y,z,w distances from the cell origin

			const y0 = y - Y0;
			const z0 = z - Z0;
			const w0 = w - W0; // For the 4D case, the simplex is a 4D shape I won't even try to describe.
			// To find out which of the 24 possible simplices we're in, we need to
			// determine the magnitude ordering of x0, y0, z0 and w0.
			// The method below is a good way of finding the ordering of x,y,z,w and
			// then find the correct traversal order for the simplex we’re in.
			// First, six pair-wise comparisons are performed between each possible pair
			// of the four coordinates, and the results are used to add up binary bits
			// for an integer index.

			const c1 = x0 > y0 ? 32 : 0;
			const c2 = x0 > z0 ? 16 : 0;
			const c3 = y0 > z0 ? 8 : 0;
			const c4 = x0 > w0 ? 4 : 0;
			const c5 = y0 > w0 ? 2 : 0;
			const c6 = z0 > w0 ? 1 : 0;
			const c = c1 + c2 + c3 + c4 + c5 + c6; // simplex[c] is a 4-vector with the numbers 0, 1, 2 and 3 in some order.
			// Many values of c will never occur, since e.g. x>y>z>w makes x<z, y<w and x<w
			// impossible. Only the 24 indices which have non-zero entries make any sense.
			// We use a thresholding to set the coordinates in turn from the largest magnitude.
			// The number 3 in the "simplex" array is at the position of the largest coordinate.

			const i1 = simplex[ c ][ 0 ] >= 3 ? 1 : 0;
			const j1 = simplex[ c ][ 1 ] >= 3 ? 1 : 0;
			const k1 = simplex[ c ][ 2 ] >= 3 ? 1 : 0;
			const l1 = simplex[ c ][ 3 ] >= 3 ? 1 : 0; // The number 2 in the "simplex" array is at the second largest coordinate.

			const i2 = simplex[ c ][ 0 ] >= 2 ? 1 : 0;
			const j2 = simplex[ c ][ 1 ] >= 2 ? 1 : 0;
			const k2 = simplex[ c ][ 2 ] >= 2 ? 1 : 0;
			const l2 = simplex[ c ][ 3 ] >= 2 ? 1 : 0; // The number 1 in the "simplex" array is at the second smallest coordinate.

			const i3 = simplex[ c ][ 0 ] >= 1 ? 1 : 0;
			const j3 = simplex[ c ][ 1 ] >= 1 ? 1 : 0;
			const k3 = simplex[ c ][ 2 ] >= 1 ? 1 : 0;
			const l3 = simplex[ c ][ 3 ] >= 1 ? 1 : 0; // The fifth corner has all coordinate offsets = 1, so no need to look that up.

			const x1 = x0 - i1 + G4; // Offsets for second corner in (x,y,z,w) coords

			const y1 = y0 - j1 + G4;
			const z1 = z0 - k1 + G4;
			const w1 = w0 - l1 + G4;
			const x2 = x0 - i2 + 2.0 * G4; // Offsets for third corner in (x,y,z,w) coords

			const y2 = y0 - j2 + 2.0 * G4;
			const z2 = z0 - k2 + 2.0 * G4;
			const w2 = w0 - l2 + 2.0 * G4;
			const x3 = x0 - i3 + 3.0 * G4; // Offsets for fourth corner in (x,y,z,w) coords

			const y3 = y0 - j3 + 3.0 * G4;
			const z3 = z0 - k3 + 3.0 * G4;
			const w3 = w0 - l3 + 3.0 * G4;
			const x4 = x0 - 1.0 + 4.0 * G4; // Offsets for last corner in (x,y,z,w) coords

			const y4 = y0 - 1.0 + 4.0 * G4;
			const z4 = z0 - 1.0 + 4.0 * G4;
			const w4 = w0 - 1.0 + 4.0 * G4; // Work out the hashed gradient indices of the five simplex corners

			const ii = i & 255;
			const jj = j & 255;
			const kk = k & 255;
			const ll = l & 255;
			const gi0 = perm[ ii + perm[ jj + perm[ kk + perm[ ll ] ] ] ] % 32;
			const gi1 = perm[ ii + i1 + perm[ jj + j1 + perm[ kk + k1 + perm[ ll + l1 ] ] ] ] % 32;
			const gi2 = perm[ ii + i2 + perm[ jj + j2 + perm[ kk + k2 + perm[ ll + l2 ] ] ] ] % 32;
			const gi3 = perm[ ii + i3 + perm[ jj + j3 + perm[ kk + k3 + perm[ ll + l3 ] ] ] ] % 32;
			const gi4 = perm[ ii + 1 + perm[ jj + 1 + perm[ kk + 1 + perm[ ll + 1 ] ] ] ] % 32; // Calculate the contribution from the five corners

			let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0 - w0 * w0;
			if ( t0 < 0 ) n0 = 0.0; else {

				t0 *= t0;
				n0 = t0 * t0 * this.dot4( grad4[ gi0 ], x0, y0, z0, w0 );

			}

			let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1 - w1 * w1;
			if ( t1 < 0 ) n1 = 0.0; else {

				t1 *= t1;
				n1 = t1 * t1 * this.dot4( grad4[ gi1 ], x1, y1, z1, w1 );

			}

			let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2 - w2 * w2;
			if ( t2 < 0 ) n2 = 0.0; else {

				t2 *= t2;
				n2 = t2 * t2 * this.dot4( grad4[ gi2 ], x2, y2, z2, w2 );

			}

			let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3 - w3 * w3;
			if ( t3 < 0 ) n3 = 0.0; else {

				t3 *= t3;
				n3 = t3 * t3 * this.dot4( grad4[ gi3 ], x3, y3, z3, w3 );

			}

			let t4 = 0.6 - x4 * x4 - y4 * y4 - z4 * z4 - w4 * w4;
			if ( t4 < 0 ) n4 = 0.0; else {

				t4 *= t4;
				n4 = t4 * t4 * this.dot4( grad4[ gi4 ], x4, y4, z4, w4 );

			} // Sum up and scale the result to cover the range [-1,1]

			return 27.0 * ( n0 + n1 + n2 + n3 + n4 );

		}

	}

	THREE.SimplexNoise = SimplexNoise;

} )();

;/* ---- shaders/SSAOShader.js ---- */
( function () {

	/**
 * References:
 * http://john-chapman-graphics.blogspot.com/2013/01/ssao-tutorial.html
 * https://learnopengl.com/Advanced-Lighting/SSAO
 * https://github.com/McNopper/OpenGL/blob/master/Example28/shader/ssao.frag.glsl
 */

	const SSAOShader = {
		defines: {
			'PERSPECTIVE_CAMERA': 1,
			'KERNEL_SIZE': 32
		},
		uniforms: {
			'tDiffuse': {
				value: null
			},
			'tNormal': {
				value: null
			},
			'tDepth': {
				value: null
			},
			'tNoise': {
				value: null
			},
			'kernel': {
				value: null
			},
			'cameraNear': {
				value: null
			},
			'cameraFar': {
				value: null
			},
			'resolution': {
				value: new THREE.Vector2()
			},
			'cameraProjectionMatrix': {
				value: new THREE.Matrix4()
			},
			'cameraInverseProjectionMatrix': {
				value: new THREE.Matrix4()
			},
			'kernelRadius': {
				value: 8
			},
			'minDistance': {
				value: 0.005
			},
			'maxDistance': {
				value: 0.05
			}
		},
		vertexShader:
  /* glsl */
  `

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,
		fragmentShader:
  /* glsl */
  `

		uniform sampler2D tDiffuse;
		uniform sampler2D tNormal;
		uniform sampler2D tDepth;
		uniform sampler2D tNoise;

		uniform vec3 kernel[ KERNEL_SIZE ];

		uniform vec2 resolution;

		uniform float cameraNear;
		uniform float cameraFar;
		uniform mat4 cameraProjectionMatrix;
		uniform mat4 cameraInverseProjectionMatrix;

		uniform float kernelRadius;
		uniform float minDistance; // avoid artifacts caused by neighbour fragments with minimal depth difference
		uniform float maxDistance; // avoid the influence of fragments which are too far away

		varying vec2 vUv;

		#include <packing>

		float getDepth( const in vec2 screenPosition ) {

			return texture2D( tDepth, screenPosition ).x;

		}

		float getLinearDepth( const in vec2 screenPosition ) {

			#if PERSPECTIVE_CAMERA == 1

				float fragCoordZ = texture2D( tDepth, screenPosition ).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );

			#else

				return texture2D( tDepth, screenPosition ).x;

			#endif

		}

		float getViewZ( const in float depth ) {

			#if PERSPECTIVE_CAMERA == 1

				return perspectiveDepthToViewZ( depth, cameraNear, cameraFar );

			#else

				return orthographicDepthToViewZ( depth, cameraNear, cameraFar );

			#endif

		}

		vec3 getViewPosition( const in vec2 screenPosition, const in float depth, const in float viewZ ) {

			float clipW = cameraProjectionMatrix[2][3] * viewZ + cameraProjectionMatrix[3][3];

			vec4 clipPosition = vec4( ( vec3( screenPosition, depth ) - 0.5 ) * 2.0, 1.0 );

			clipPosition *= clipW; // unprojection.

			return ( cameraInverseProjectionMatrix * clipPosition ).xyz;

		}

		vec3 getViewNormal( const in vec2 screenPosition ) {

			return unpackRGBToNormal( texture2D( tNormal, screenPosition ).xyz );

		}

		void main() {

			float depth = getDepth( vUv );
			float viewZ = getViewZ( depth );

			vec3 viewPosition = getViewPosition( vUv, depth, viewZ );
			vec3 viewNormal = getViewNormal( vUv );

			vec2 noiseScale = vec2( resolution.x / 4.0, resolution.y / 4.0 );
			vec3 random = texture2D( tNoise, vUv * noiseScale ).xyz;

			// compute matrix used to reorient a kernel vector

			vec3 tangent = normalize( random - viewNormal * dot( random, viewNormal ) );
			vec3 bitangent = cross( viewNormal, tangent );
			mat3 kernelMatrix = mat3( tangent, bitangent, viewNormal );

		 float occlusion = 0.0;

		 for ( int i = 0; i < KERNEL_SIZE; i ++ ) {

				vec3 sampleVector = kernelMatrix * kernel[ i ]; // reorient sample vector in view space
				vec3 samplePoint = viewPosition + ( sampleVector * kernelRadius ); // calculate sample point

				vec4 samplePointNDC = cameraProjectionMatrix * vec4( samplePoint, 1.0 ); // project point and calculate NDC
				samplePointNDC /= samplePointNDC.w;

				vec2 samplePointUv = samplePointNDC.xy * 0.5 + 0.5; // compute uv coordinates

				float realDepth = getLinearDepth( samplePointUv ); // get linear depth from depth texture
				float sampleDepth = viewZToOrthographicDepth( samplePoint.z, cameraNear, cameraFar ); // compute linear depth of the sample view Z value
				float delta = sampleDepth - realDepth;

				if ( delta > minDistance && delta < maxDistance ) { // if fragment is before sample point, increase occlusion

					occlusion += 1.0;

				}

			}

			occlusion = clamp( occlusion / float( KERNEL_SIZE ), 0.0, 1.0 );

			gl_FragColor = vec4( vec3( 1.0 - occlusion ), 1.0 );

		}`
	};
	const SSAODepthShader = {
		defines: {
			'PERSPECTIVE_CAMERA': 1
		},
		uniforms: {
			'tDepth': {
				value: null
			},
			'cameraNear': {
				value: null
			},
			'cameraFar': {
				value: null
			}
		},
		vertexShader: `varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,
		fragmentShader: `uniform sampler2D tDepth;

		uniform float cameraNear;
		uniform float cameraFar;

		varying vec2 vUv;

		#include <packing>

		float getLinearDepth( const in vec2 screenPosition ) {

			#if PERSPECTIVE_CAMERA == 1

				float fragCoordZ = texture2D( tDepth, screenPosition ).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );

			#else

				return texture2D( tDepth, screenPosition ).x;

			#endif

		}

		void main() {

			float depth = getLinearDepth( vUv );
			gl_FragColor = vec4( vec3( 1.0 - depth ), 1.0 );

		}`
	};
	const SSAOBlurShader = {
		uniforms: {
			'tDiffuse': {
				value: null
			},
			'resolution': {
				value: new THREE.Vector2()
			}
		},
		vertexShader: `varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,
		fragmentShader: `uniform sampler2D tDiffuse;

		uniform vec2 resolution;

		varying vec2 vUv;

		void main() {

			vec2 texelSize = ( 1.0 / resolution );
			float result = 0.0;

			for ( int i = - 2; i <= 2; i ++ ) {

				for ( int j = - 2; j <= 2; j ++ ) {

					vec2 offset = ( vec2( float( i ), float( j ) ) ) * texelSize;
					result += texture2D( tDiffuse, vUv + offset ).r;

				}

			}

			gl_FragColor = vec4( vec3( result / ( 5.0 * 5.0 ) ), 1.0 );

		}`
	};

	THREE.SSAOBlurShader = SSAOBlurShader;
	THREE.SSAODepthShader = SSAODepthShader;
	THREE.SSAOShader = SSAOShader;

} )();

;/* ---- postprocessing/SSAOPass.js ---- */
( function () {

	class SSAOPass extends THREE.Pass {

		constructor( scene, camera, width, height ) {

			super();
			this.width = width !== undefined ? width : 512;
			this.height = height !== undefined ? height : 512;
			this.clear = true;
			this.camera = camera;
			this.scene = scene;
			this.kernelRadius = 8;
			this.kernelSize = 32;
			this.kernel = [];
			this.noiseTexture = null;
			this.output = 0;
			this.minDistance = 0.005;
			this.maxDistance = 0.1;
			this._visibilityCache = new Map(); //

			this.generateSampleKernel();
			this.generateRandomKernelRotations(); // beauty render target

			const depthTexture = new THREE.DepthTexture();
			depthTexture.type = THREE.UnsignedShortType;
			this.beautyRenderTarget = new THREE.WebGLRenderTarget( this.width, this.height, {
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat
			} ); // normal render target with depth buffer

			this.normalRenderTarget = new THREE.WebGLRenderTarget( this.width, this.height, {
				minFilter: THREE.NearestFilter,
				magFilter: THREE.NearestFilter,
				format: THREE.RGBAFormat,
				depthTexture: depthTexture
			} ); // ssao render target

			this.ssaoRenderTarget = new THREE.WebGLRenderTarget( this.width, this.height, {
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat
			} );
			this.blurRenderTarget = this.ssaoRenderTarget.clone(); // ssao material

			if ( THREE.SSAOShader === undefined ) {

				console.error( 'THREE.SSAOPass: The pass relies on THREE.SSAOShader.' );

			}

			this.ssaoMaterial = new THREE.ShaderMaterial( {
				defines: Object.assign( {}, THREE.SSAOShader.defines ),
				uniforms: THREE.UniformsUtils.clone( THREE.SSAOShader.uniforms ),
				vertexShader: THREE.SSAOShader.vertexShader,
				fragmentShader: THREE.SSAOShader.fragmentShader,
				blending: THREE.NoBlending
			} );
			this.ssaoMaterial.uniforms[ 'tDiffuse' ].value = this.beautyRenderTarget.texture;
			this.ssaoMaterial.uniforms[ 'tNormal' ].value = this.normalRenderTarget.texture;
			this.ssaoMaterial.uniforms[ 'tDepth' ].value = this.normalRenderTarget.depthTexture;
			this.ssaoMaterial.uniforms[ 'tNoise' ].value = this.noiseTexture;
			this.ssaoMaterial.uniforms[ 'kernel' ].value = this.kernel;
			this.ssaoMaterial.uniforms[ 'cameraNear' ].value = this.camera.near;
			this.ssaoMaterial.uniforms[ 'cameraFar' ].value = this.camera.far;
			this.ssaoMaterial.uniforms[ 'resolution' ].value.set( this.width, this.height );
			this.ssaoMaterial.uniforms[ 'cameraProjectionMatrix' ].value.copy( this.camera.projectionMatrix );
			this.ssaoMaterial.uniforms[ 'cameraInverseProjectionMatrix' ].value.copy( this.camera.projectionMatrixInverse ); // normal material

			this.normalMaterial = new THREE.MeshNormalMaterial();
			this.normalMaterial.blending = THREE.NoBlending; // blur material

			this.blurMaterial = new THREE.ShaderMaterial( {
				defines: Object.assign( {}, THREE.SSAOBlurShader.defines ),
				uniforms: THREE.UniformsUtils.clone( THREE.SSAOBlurShader.uniforms ),
				vertexShader: THREE.SSAOBlurShader.vertexShader,
				fragmentShader: THREE.SSAOBlurShader.fragmentShader
			} );
			this.blurMaterial.uniforms[ 'tDiffuse' ].value = this.ssaoRenderTarget.texture;
			this.blurMaterial.uniforms[ 'resolution' ].value.set( this.width, this.height ); // material for rendering the depth

			this.depthRenderMaterial = new THREE.ShaderMaterial( {
				defines: Object.assign( {}, THREE.SSAODepthShader.defines ),
				uniforms: THREE.UniformsUtils.clone( THREE.SSAODepthShader.uniforms ),
				vertexShader: THREE.SSAODepthShader.vertexShader,
				fragmentShader: THREE.SSAODepthShader.fragmentShader,
				blending: THREE.NoBlending
			} );
			this.depthRenderMaterial.uniforms[ 'tDepth' ].value = this.normalRenderTarget.depthTexture;
			this.depthRenderMaterial.uniforms[ 'cameraNear' ].value = this.camera.near;
			this.depthRenderMaterial.uniforms[ 'cameraFar' ].value = this.camera.far; // material for rendering the content of a render target

			this.copyMaterial = new THREE.ShaderMaterial( {
				uniforms: THREE.UniformsUtils.clone( THREE.CopyShader.uniforms ),
				vertexShader: THREE.CopyShader.vertexShader,
				fragmentShader: THREE.CopyShader.fragmentShader,
				transparent: true,
				depthTest: false,
				depthWrite: false,
				blendSrc: THREE.DstColorFactor,
				blendDst: THREE.ZeroFactor,
				blendEquation: THREE.AddEquation,
				blendSrcAlpha: THREE.DstAlphaFactor,
				blendDstAlpha: THREE.ZeroFactor,
				blendEquationAlpha: THREE.AddEquation
			} );
			this.fsQuad = new THREE.FullScreenQuad( null );
			this.originalClearColor = new THREE.Color();

		}

		dispose() {

			// dispose render targets
			this.beautyRenderTarget.dispose();
			this.normalRenderTarget.dispose();
			this.ssaoRenderTarget.dispose();
			this.blurRenderTarget.dispose(); // dispose materials

			this.normalMaterial.dispose();
			this.blurMaterial.dispose();
			this.copyMaterial.dispose();
			this.depthRenderMaterial.dispose(); // dipsose full screen quad

			this.fsQuad.dispose();

		}

		render( renderer, writeBuffer
			/*, readBuffer, deltaTime, maskActive */
		) {

			// render beauty
			renderer.setRenderTarget( this.beautyRenderTarget );
			renderer.clear();
			renderer.render( this.scene, this.camera ); // render normals and depth (honor only meshes, points and lines do not contribute to SSAO)

			this.overrideVisibility();
			this.renderOverride( renderer, this.normalMaterial, this.normalRenderTarget, 0x7777ff, 1.0 );
			this.restoreVisibility(); // render SSAO

			this.ssaoMaterial.uniforms[ 'kernelRadius' ].value = this.kernelRadius;
			this.ssaoMaterial.uniforms[ 'minDistance' ].value = this.minDistance;
			this.ssaoMaterial.uniforms[ 'maxDistance' ].value = this.maxDistance;
			this.renderPass( renderer, this.ssaoMaterial, this.ssaoRenderTarget ); // render blur

			this.renderPass( renderer, this.blurMaterial, this.blurRenderTarget ); // output result to screen

			switch ( this.output ) {

				case SSAOPass.OUTPUT.SSAO:
					this.copyMaterial.uniforms[ 'tDiffuse' ].value = this.ssaoRenderTarget.texture;
					this.copyMaterial.blending = THREE.NoBlending;
					this.renderPass( renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer );
					break;

				case SSAOPass.OUTPUT.Blur:
					this.copyMaterial.uniforms[ 'tDiffuse' ].value = this.blurRenderTarget.texture;
					this.copyMaterial.blending = THREE.NoBlending;
					this.renderPass( renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer );
					break;

				case SSAOPass.OUTPUT.Beauty:
					this.copyMaterial.uniforms[ 'tDiffuse' ].value = this.beautyRenderTarget.texture;
					this.copyMaterial.blending = THREE.NoBlending;
					this.renderPass( renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer );
					break;

				case SSAOPass.OUTPUT.Depth:
					this.renderPass( renderer, this.depthRenderMaterial, this.renderToScreen ? null : writeBuffer );
					break;

				case SSAOPass.OUTPUT.Normal:
					this.copyMaterial.uniforms[ 'tDiffuse' ].value = this.normalRenderTarget.texture;
					this.copyMaterial.blending = THREE.NoBlending;
					this.renderPass( renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer );
					break;

				case SSAOPass.OUTPUT.Default:
					this.copyMaterial.uniforms[ 'tDiffuse' ].value = this.beautyRenderTarget.texture;
					this.copyMaterial.blending = THREE.NoBlending;
					this.renderPass( renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer );
					this.copyMaterial.uniforms[ 'tDiffuse' ].value = this.blurRenderTarget.texture;
					this.copyMaterial.blending = THREE.CustomBlending;
					this.renderPass( renderer, this.copyMaterial, this.renderToScreen ? null : writeBuffer );
					break;

				default:
					console.warn( 'THREE.SSAOPass: Unknown output type.' );

			}

		}

		renderPass( renderer, passMaterial, renderTarget, clearColor, clearAlpha ) {

			// save original state
			renderer.getClearColor( this.originalClearColor );
			const originalClearAlpha = renderer.getClearAlpha();
			const originalAutoClear = renderer.autoClear;
			renderer.setRenderTarget( renderTarget ); // setup pass state

			renderer.autoClear = false;

			if ( clearColor !== undefined && clearColor !== null ) {

				renderer.setClearColor( clearColor );
				renderer.setClearAlpha( clearAlpha || 0.0 );
				renderer.clear();

			}

			this.fsQuad.material = passMaterial;
			this.fsQuad.render( renderer ); // restore original state

			renderer.autoClear = originalAutoClear;
			renderer.setClearColor( this.originalClearColor );
			renderer.setClearAlpha( originalClearAlpha );

		}

		renderOverride( renderer, overrideMaterial, renderTarget, clearColor, clearAlpha ) {

			renderer.getClearColor( this.originalClearColor );
			const originalClearAlpha = renderer.getClearAlpha();
			const originalAutoClear = renderer.autoClear;
			renderer.setRenderTarget( renderTarget );
			renderer.autoClear = false;
			clearColor = overrideMaterial.clearColor || clearColor;
			clearAlpha = overrideMaterial.clearAlpha || clearAlpha;

			if ( clearColor !== undefined && clearColor !== null ) {

				renderer.setClearColor( clearColor );
				renderer.setClearAlpha( clearAlpha || 0.0 );
				renderer.clear();

			}

			this.scene.overrideMaterial = overrideMaterial;
			renderer.render( this.scene, this.camera );
			this.scene.overrideMaterial = null; // restore original state

			renderer.autoClear = originalAutoClear;
			renderer.setClearColor( this.originalClearColor );
			renderer.setClearAlpha( originalClearAlpha );

		}

		setSize( width, height ) {

			this.width = width;
			this.height = height;
			this.beautyRenderTarget.setSize( width, height );
			this.ssaoRenderTarget.setSize( width, height );
			this.normalRenderTarget.setSize( width, height );
			this.blurRenderTarget.setSize( width, height );
			this.ssaoMaterial.uniforms[ 'resolution' ].value.set( width, height );
			this.ssaoMaterial.uniforms[ 'cameraProjectionMatrix' ].value.copy( this.camera.projectionMatrix );
			this.ssaoMaterial.uniforms[ 'cameraInverseProjectionMatrix' ].value.copy( this.camera.projectionMatrixInverse );
			this.blurMaterial.uniforms[ 'resolution' ].value.set( width, height );

		}

		generateSampleKernel() {

			const kernelSize = this.kernelSize;
			const kernel = this.kernel;

			for ( let i = 0; i < kernelSize; i ++ ) {

				const sample = new THREE.Vector3();
				sample.x = Math.random() * 2 - 1;
				sample.y = Math.random() * 2 - 1;
				sample.z = Math.random();
				sample.normalize();
				let scale = i / kernelSize;
				scale = THREE.MathUtils.lerp( 0.1, 1, scale * scale );
				sample.multiplyScalar( scale );
				kernel.push( sample );

			}

		}

		generateRandomKernelRotations() {

			const width = 4,
				height = 4;

			if ( THREE.SimplexNoise === undefined ) {

				console.error( 'THREE.SSAOPass: The pass relies on THREE.SimplexNoise.' );

			}

			const simplex = new THREE.SimplexNoise();
			const size = width * height;
			const data = new Float32Array( size * 4 );

			for ( let i = 0; i < size; i ++ ) {

				const stride = i * 4;
				const x = Math.random() * 2 - 1;
				const y = Math.random() * 2 - 1;
				const z = 0;
				const noise = simplex.noise3d( x, y, z );
				data[ stride ] = noise;
				data[ stride + 1 ] = noise;
				data[ stride + 2 ] = noise;
				data[ stride + 3 ] = 1;

			}

			this.noiseTexture = new THREE.DataTexture( data, width, height, THREE.RGBAFormat, THREE.FloatType );
			this.noiseTexture.wrapS = THREE.RepeatWrapping;
			this.noiseTexture.wrapT = THREE.RepeatWrapping;

		}

		overrideVisibility() {

			const scene = this.scene;
			const cache = this._visibilityCache;
			scene.traverse( function ( object ) {

				cache.set( object, object.visible );
				if ( object.isPoints || object.isLine ) object.visible = false;

			} );

		}

		restoreVisibility() {

			const scene = this.scene;
			const cache = this._visibilityCache;
			scene.traverse( function ( object ) {

				const visible = cache.get( object );
				object.visible = visible;

			} );
			cache.clear();

		}

	}

	SSAOPass.OUTPUT = {
		'Default': 0,
		'SSAO': 1,
		'Blur': 2,
		'Beauty': 3,
		'Depth': 4,
		'Normal': 5
	};

	THREE.SSAOPass = SSAOPass;

} )();
