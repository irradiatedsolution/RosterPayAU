import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Modal, KeyboardAvoidingView, Platform, Keyboard, Share, Linking } from 'react-native';
import { useState, useCallback } from 'react';
import { usePersonStore, useRosterStore, useSubStore } from '../../src/store';

const C = {
  bg:'#F0F4FF', white:'#FFFFFF', navy:'#1E3A5F',
  teal:'#0EA5A0', tealL:'#E0F7F6', tealB:'#9EDEDD',
  gold:'#F59E0B', goldL:'#FEF3C7',
  red:'#EF4444', redL:'#FEE2E2',
  green:'#10B981', greenL:'#D1FAE5',
  purple:'#7C3AED', purpleL:'#EDE9FE',
  orange:'#F97316', pink:'#EC4899',
  text:'#1E293B', muted:'#64748B',
  border:'#CBD5E1', borderL:'#E2E8F0',
};

const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDays(y:number,m:number){ return new Date(y,m+1,0).getDate(); }
function getFirst(y:number,m:number){ return new Date(y,m,1).getDay(); }
function uid(){ return Math.random().toString(36).slice(2,9); }
function toISO(y:number,m:number,d:number){ return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }

function formatTime(raw:string):string {
  const d=raw.replace(/\D/g,'').slice(0,4);
  if(d.length<=2) return d;
  return d.slice(0,2)+':'+d.slice(2);
}

function calcHours(s:string,e:string,brk:number):number {
  if(!s||!e||!s.includes(':')||!e.includes(':')) return 0;
  const[sh,sm]=s.split(':').map(Number);
  const[eh,em]=e.split(':').map(Number);
  if([sh,sm,eh,em].some(isNaN)) return 0;
  let d=(eh*60+em)-(sh*60+sm);
  if(d<=0) d+=1440;
  return Math.max(0,(d-brk)/60);
}

interface PenaltyOption { multiplier:number; label:string; color:string; }

function getPenaltyOptions(dow:number): PenaltyOption[] {
  const base   = { multiplier:1.0, label:'Ordinary Time (×1.0)',    color:C.teal   };
  const oncall = { multiplier:2.0, label:'On-Call / Recall (×2.0)', color:C.purple };
  const pubhol = { multiplier:2.5, label:'Public Holiday (×2.5)',   color:C.pink   };
  const ot15   = { multiplier:1.5, label:'Overtime (×1.5)',          color:C.gold   };
  const ot20   = { multiplier:2.0, label:'Overtime (×2.0)',          color:C.orange };
  const sat15  = { multiplier:1.5, label:'Saturday (×1.5)',          color:C.orange };
  const sat20  = { multiplier:2.0, label:'Saturday (×2.0)',          color:C.red    };
  const sun20  = { multiplier:2.0, label:'Sunday (×2.0)',            color:C.red    };
  if(dow===0) return [sun20, pubhol, base, oncall];
  if(dow===6) return [sat15, sat20, pubhol, base, oncall];
  return [base, oncall, ot15, ot20, pubhol];
}

const DEFAULT_SHIFT_PRESETS = [
  { id:'p1', label:'Early',    start:'06:00', end:'14:00', brk:30, color:'#F59E0B' },
  { id:'p2', label:'Day',      start:'08:00', end:'16:00', brk:30, color:'#3B82F6' },
  { id:'p3', label:'Arvo',     start:'14:00', end:'22:00', brk:30, color:'#F97316' },
  { id:'p4', label:'Night',    start:'22:00', end:'06:00', brk:30, color:'#7C3AED' },
  { id:'p5', label:'Long Day', start:'07:00', end:'19:00', brk:60, color:'#10B981' },
  { id:'p6', label:'Half Day', start:'08:00', end:'13:00', brk:0,  color:'#06B6D4' },
];

const ALLOWANCE_CATALOG = [
  { id:'a1',  name:'Afternoon Shift Allowance', taxable:true,  color:'#F97316' },
  { id:'a2',  name:'Night Shift Allowance',     taxable:true,  color:'#7C3AED' },
  { id:'a3',  name:'Morning Shift Allowance',   taxable:true,  color:'#F59E0B' },
  { id:'a4',  name:'Weekend Allowance',         taxable:true,  color:'#EF4444' },
  { id:'a5',  name:'Public Holiday Allowance',  taxable:true,  color:'#EC4899' },
  { id:'a6',  name:'Overtime Allowance',        taxable:true,  color:'#8B5CF6' },
  { id:'a7',  name:'On-Call Allowance',         taxable:true,  color:'#7C3AED' },
  { id:'a8',  name:'Change of Shift',           taxable:true,  color:'#F97316' },
  { id:'a9',  name:'Meal Allowance',            taxable:false, color:'#10B981' },
  { id:'a10', name:'Travel Allowance',          taxable:false, color:'#06B6D4' },
  { id:'a11', name:'Uniform Allowance',         taxable:false, color:'#3B82F6' },
  { id:'a12', name:'Custom Allowance',          taxable:true,  color:'#64748B' },
];

interface ShiftAllowance { id:string; name:string; amount:string; taxable:boolean; color:string; }
interface DraftState {
  start:string; end:string; brk:string; label:string;
  allowances:ShiftAllowance[];
  penaltyMultiplier:number; penaltyLabel:string; penaltyColor:string;
}

export default function RosterScreen() {
  const today = new Date();
  const [year,setYear]   = useState(today.getFullYear());
  const [month,setMonth] = useState(today.getMonth());
  const [pickerDay,setPickerDay]   = useState<number|null>(null);
  const [pickerVisible,setPickerVisible] = useState(false);
  const [detailDay,setDetailDay]   = useState<number|null>(null);
  const [showAllowCatalog,setShowAllowCatalog] = useState(false);

  // Store
  const person = usePersonStore(s => s.getActivePerson());
  const { setEntry, removeEntry, getEntry } = useRosterStore.getState();
  const rosterEntries = useRosterStore(s => s.entries);

  const isPro = useSubStore(s => s.isPro);
  const setPlan = useSubStore(s => s.setPlan);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const myShiftPresets = person?.shiftPresets?.filter((sp:any) => sp.label) || [];
  const myAllowPresets = person?.allowancePresets?.filter((ap:any) => ap.name) || [];
  const shiftPresetsToUse = myShiftPresets.length > 0 ? myShiftPresets : DEFAULT_SHIFT_PRESETS;

  const initDraft = ():DraftState => ({
    start:'07:00', end:'15:00', brk:'30', label:'',
    allowances:[], penaltyMultiplier:1.0,
    penaltyLabel:'Ordinary Time (×1.0)', penaltyColor:C.teal,
  });
  const [draft,setDraft] = useState<DraftState>(initDraft());

  const daysInMonth = getDays(year,month);
  const firstDay    = getFirst(year,month);
  const cells:Array<number|null> = [];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);
  while(cells.length%7!==0) cells.push(null);

  const isToday = (d:number) => d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();

  function rk(d:number){ return `${person?.id||'user'}_${toISO(year,month,d)}`; }

  function getShift(d:number){ return rosterEntries[rk(d)]; }

  function navMonth(dir:number){
    if(dir===-1){ if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }
    else{ if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }
  }

  function openPicker(day:number){
    const existing = getShift(day);
    if(existing && !existing.off){
      const e = existing as any;
      setDraft({
        start:e.start||'07:00', end:e.end||'15:00', brk:String(e.brk||30),
        label:e.label||'', allowances:e.allowances||[],
        penaltyMultiplier:e.penaltyMultiplier||1,
        penaltyLabel:e.penaltyLabel||'Ordinary Time (×1.0)',
        penaltyColor:e.penaltyColor||C.teal,
      });
    } else {
      const dow = new Date(year,month,day).getDay();
      const suggested = getPenaltyOptions(dow)[0];
      setDraft({...initDraft(),
        penaltyMultiplier:suggested.multiplier,
        penaltyLabel:suggested.label,
        penaltyColor:suggested.color,
      });
    }
    setPickerDay(day);
    setPickerVisible(true);
  }

  function closePicker(){
    setPickerVisible(false);
    setTimeout(()=>setPickerDay(null),300);
  }

  function saveDraft(){
    if(pickerDay===null||!person) return;

    const brk=parseFloat(draft.brk)||0;
    const net=calcHours(draft.start,draft.end,brk);
    const iso=toISO(year,month,pickerDay);
    setEntry(rk(pickerDay),{
      personId:person.id, date:iso, off:false,
      shiftPresetId:null, label:draft.label,
      start:draft.start, end:draft.end, brk,
      grossHours:calcHours(draft.start,draft.end,0),
      netHours:+net.toFixed(2),
      allowances:draft.allowances.map(a=>({...a,amount:parseFloat(a.amount)||0})),
      penaltyMultiplier:draft.penaltyMultiplier,
      penaltyLabel:draft.penaltyLabel,
      penaltyColor:draft.penaltyColor,
    } as any);
    closePicker();
  }

  function setDayOff(){
    if(pickerDay===null||!person) return;
    const iso=toISO(year,month,pickerDay);
    setEntry(rk(pickerDay),{
      personId:person.id, date:iso, off:true,
    } as any);
    closePicker();
  }

  function deleteShift(){
    if(pickerDay===null) return;
    removeEntry(rk(pickerDay));
    closePicker();
  }

  function buildShareMsg(day:number):string {
    const s=getShift(day) as any;
    if(!s||s.off) return '';
    const dow=DAYS[new Date(year,month,day).getDay()];
    const allNames=(s.allowances||[]).filter((a:any)=>a.amount>0).map((a:any)=>a.name).join(', ');
    let msg=`Hi! 👋 I'm on a ${s.start}–${s.end} shift on ${dow} ${day} ${MONTHS[month]} ${year}.`;
    msg+=`\n⏱ ${s.netHours}h net`;
    if(s.penaltyMultiplier>1) msg+=`\n⚡ ${s.penaltyLabel}`;
    if(s.label) msg+=`\n🏷 ${s.label}`;
    if(allNames) msg+=`\n💰 ${allNames}`;
    msg+=`\n\nSent via RosterPay AU 🦘`;
    return msg;
  }

  async function shareViaSystem(day:number){ await Share.share({message:buildShareMsg(day)}); }
  async function shareWhatsApp(day:number){
    const url=`whatsapp://send?text=${encodeURIComponent(buildShareMsg(day))}`;
    if(await Linking.canOpenURL(url)) await Linking.openURL(url);
    else await Share.share({message:buildShareMsg(day)});
  }
  async function shareSMS(day:number){
    const msg=buildShareMsg(day);
    await Linking.openURL(Platform.OS==='ios'?`sms:&body=${encodeURIComponent(msg)}`:`sms:?body=${encodeURIComponent(msg)}`);
  }
  async function shareFacebook(day:number){
    const url=`fb-messenger://share?text=${encodeURIComponent(buildShareMsg(day))}`;
    if(await Linking.canOpenURL(url)) await Linking.openURL(url);
    else await Share.share({message:buildShareMsg(day)});
  }
  async function shareEmail(day:number){
    const s=getShift(day) as any; if(!s||s.off) return;
    const dow=DAYS[new Date(year,month,day).getDay()];
    await Linking.openURL(`mailto:?subject=${encodeURIComponent(`My Shift — ${dow} ${day} ${MONTHS[month]} ${year}`)}&body=${encodeURIComponent(buildShareMsg(day))}`);
  }

  // Stats for this month
  const stats = cells.filter(Boolean).reduce((acc,day)=>{
    const s=getShift(day!) as any;
    if(!s) return acc;
    if(s.off){acc.offDays++;return acc;}
    acc.workDays++;
    acc.totalHours+=s.netHours||0;
    acc.totalAllow+=(s.allowances||[]).reduce((sum:number,a:any)=>sum+(a.amount||0),0);
    return acc;
  },{totalHours:0,workDays:0,offDays:0,totalAllow:0});

  const draftNet = calcHours(draft.start,draft.end,parseFloat(draft.brk)||0);
  const pickerDow = pickerDay!==null ? new Date(year,month,pickerDay).getDay() : 0;
  const penaltyOptions = getPenaltyOptions(pickerDow);
  const detailShift = detailDay!==null ? getShift(detailDay) as any : null;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} onScrollBeginDrag={Keyboard.dismiss}>

        {/* Month nav */}
        <View style={s.nav}>
          <TouchableOpacity onPress={()=>navMonth(-1)} style={s.navBtn}><Text style={s.navArrow}>‹</Text></TouchableOpacity>
          <View style={{alignItems:'center'}}>
            <Text style={s.monthTitle}>{MONTHS[month]} <Text style={{color:C.teal}}>{year}</Text></Text>
            <Text style={s.monthSub}>Tap to add · 📤 to share</Text>
          </View>
          <TouchableOpacity onPress={()=>navMonth(1)} style={s.navBtn}><Text style={s.navArrow}>›</Text></TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            {icon:'⏱',label:'Hours',   value:`${stats.totalHours.toFixed(1)}h`,bg:C.tealL,  color:C.teal},
            {icon:'📆',label:'Days',    value:String(stats.workDays),            bg:'#EEF2FF',color:'#4F46E5'},
            {icon:'💰',label:'Allow.',  value:`$${stats.totalAllow.toFixed(0)}`, bg:C.greenL, color:C.green},
            {icon:'🌴',label:'Days Off',value:String(stats.offDays),             bg:C.goldL,  color:C.gold},
          ].map(st=>(
            <View key={st.label} style={[s.statCard,{backgroundColor:st.bg}]}>
              <Text style={s.statIcon}>{st.icon}</Text>
              <Text style={[s.statValue,{color:st.color}]}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Calendar */}
        <View style={s.calCard}>
          <View style={s.dayHeaders}>
            {DAYS.map((d,i)=><Text key={d} style={[s.dayHeader,{color:i===0||i===6?C.red:C.muted}]}>{d.toUpperCase()}</Text>)}
          </View>
          <View style={s.grid}>
            {cells.map((day,i)=>{
              if(!day) return <View key={i} style={s.emptyCell}/>;
              const shift=getShift(day) as any;
              const dow=new Date(year,month,day).getDay();
              const isWknd=dow===0||dow===6;
              const hasShift=shift&&!shift.off;
              const isOff=shift?.off;
              const allAmt=hasShift?(shift.allowances||[]).reduce((sum:number,a:any)=>sum+(a.amount||0),0):0;
              const pColor=hasShift?(shift.penaltyColor||C.teal):C.teal;

              return (
                <TouchableOpacity key={i}
                  onPress={()=>openPicker(day)}
                  onLongPress={()=>hasShift&&setDetailDay(day)}
                  style={[s.cell,
                    isWknd&&!hasShift&&!isOff&&s.cellWknd,
                    hasShift&&{backgroundColor:pColor+'22',borderColor:pColor+'88'},
                    isOff&&{backgroundColor:'#F8FAFC'},
                    isToday(day)&&{borderWidth:2,borderColor:C.teal},
                  ]}>
                  <Text style={[s.cellDay,
                    isToday(day)&&{color:C.teal,fontWeight:'900'},
                    isWknd&&!isToday(day)&&{color:C.red},
                  ]}>{day}</Text>
                  {isOff&&<Text style={s.offLabel}>OFF</Text>}
                  {hasShift&&<>
                    <Text style={[s.shiftTime,{color:pColor}]}>{shift.start}–{shift.end}</Text>
                    <Text style={s.shiftNet}>{shift.netHours}h</Text>
                    {shift.penaltyMultiplier>1&&<Text style={[s.penaltyBadge,{color:pColor}]}>×{shift.penaltyMultiplier}</Text>}
                    {allAmt>0&&<Text style={s.allowAmt}>+${allAmt.toFixed(0)}</Text>}
                    <TouchableOpacity onPress={(e)=>{e.stopPropagation();setDetailDay(day);}} style={s.shareBtn}>
                      <Text style={s.shareBtnTxt}>📤</Text>
                    </TouchableOpacity>
                  </>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <Text style={s.legendHint}>Tap = edit · Long press or 📤 = share</Text>

      </ScrollView>

      {/* ══ SHIFT PICKER MODAL ════════════════════════════════════ */}
      <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
          <SafeAreaView style={s.modalSafe}>
            <ScrollView contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss}>

              <View style={s.modalHeader}>
                <View>
                  <Text style={s.modalTitle}>
                    {pickerDay!==null?`${DAYS[new Date(year,month,pickerDay).getDay()]} ${pickerDay} ${MONTHS[month]} ${year}`:''}
                  </Text>
                  <Text style={s.modalSub}>Set hours, penalty & allowances</Text>
                </View>
                <TouchableOpacity onPress={closePicker} style={s.closeBtn}>
                  <Text style={s.closeBtnTxt}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Shift presets */}
              <View style={s.section}>
                <Text style={s.sectionLbl}>Shift presets</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{flexDirection:'row',gap:8,paddingBottom:4}}>
                    {shiftPresetsToUse.map((sp:any)=>(
                      <TouchableOpacity key={sp.id}
                        onPress={()=>setDraft(d=>({...d,start:sp.start,end:sp.end,brk:String(sp.brk||0),label:sp.label}))}
                        style={[s.presetChip,{borderColor:sp.color||C.teal,backgroundColor:(sp.color||C.teal)+'18'}]}>
                        <Text style={[s.presetChipLbl,{color:sp.color||C.teal}]}>{sp.label}</Text>
                        <Text style={s.presetChipSub}>{sp.start}–{sp.end}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Times */}
              <View style={s.section}>
                <Text style={s.sectionLbl}>Shift times</Text>
                <View style={{flexDirection:'row',gap:8}}>
                  <View style={{flex:1}}>
                    <Text style={s.lbl}>Start</Text>
                    <TextInput style={s.inp} value={draft.start}
                      onChangeText={v=>setDraft(d=>({...d,start:formatTime(v)}))}
                      placeholder="07:00" keyboardType="number-pad" maxLength={5}/>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={s.lbl}>End</Text>
                    <TextInput style={s.inp} value={draft.end}
                      onChangeText={v=>setDraft(d=>({...d,end:formatTime(v)}))}
                      placeholder="15:00" keyboardType="number-pad" maxLength={5}/>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={s.lbl}>Break (mins)</Text>
                    <TextInput style={s.inp} value={draft.brk}
                      onChangeText={v=>setDraft(d=>({...d,brk:v}))}
                      placeholder="30" keyboardType="decimal-pad"/>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={s.lbl}>Label</Text>
                    <TextInput style={s.inp} value={draft.label}
                      onChangeText={v=>setDraft(d=>({...d,label:v}))}
                      placeholder="optional"/>
                  </View>
                </View>
                <View style={s.hoursPreview}>
                  <Text style={s.hpTxt}>Gross: <Text style={{color:C.navy,fontWeight:'800'}}>{calcHours(draft.start,draft.end,0).toFixed(2)}h</Text></Text>
                  <Text style={s.hpTxt}>Break: <Text style={{color:C.gold,fontWeight:'800'}}>{draft.brk||0}m</Text></Text>
                  <Text style={s.hpTxt}>Net: <Text style={{color:C.teal,fontWeight:'900',fontSize:15}}>{draftNet.toFixed(2)}h</Text></Text>
                </View>
              </View>

              {/* Penalty rate */}
              <View style={s.section}>
                <Text style={s.sectionLbl}>Penalty / rate type</Text>
                <View style={{gap:7}}>
                  {penaltyOptions.map(opt=>{
                    const selected=draft.penaltyMultiplier===opt.multiplier&&draft.penaltyLabel===opt.label;
                    return (
                      <TouchableOpacity key={opt.label}
                        onPress={()=>setDraft(d=>({...d,penaltyMultiplier:opt.multiplier,penaltyLabel:opt.label,penaltyColor:opt.color}))}
                        style={[s.penaltyOpt,selected&&{backgroundColor:opt.color+'22',borderColor:opt.color}]}>
                        <View style={[s.penaltyDot,{backgroundColor:opt.color}]}/>
                        <Text style={[s.penaltyTxt,selected&&{color:opt.color,fontWeight:'800'}]}>{opt.label}</Text>
                        {selected&&<Text style={{fontSize:16,fontWeight:'900',color:opt.color}}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Allowances */}
              <View style={s.section}>
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <Text style={s.sectionLbl}>Allowances</Text>
                  <TouchableOpacity
                    onPress={()=>{setPickerVisible(false);setTimeout(()=>setShowAllowCatalog(true),300);}}
                    style={s.addAllowBtn}>
                    <Text style={s.addAllowBtnTxt}>+ Add Allowance</Text>
                  </TouchableOpacity>
                </View>
                {draft.allowances.length===0?(
                  <View style={s.emptyBox}>
                    <Text style={{color:C.muted,fontSize:13}}>No allowances — tap + Add Allowance</Text>
                  </View>
                ):(
                  <>
                    {draft.allowances.map((a,i)=>(
                      <View key={a.id} style={s.allowRow}>
                        <View style={[s.allowDot,{backgroundColor:a.color}]}/>
                        <View style={{flex:1}}>
                          <TextInput style={s.inp} value={a.name}
                            onChangeText={v=>{const arr=[...draft.allowances];arr[i].name=v;setDraft(d=>({...d,allowances:arr}));}}
                            placeholder="Allowance name"/>
                          <Text style={{fontSize:9,color:a.taxable?C.red:C.green,fontWeight:'700',marginTop:2}}>
                            {a.taxable?'Taxable':'Non-Taxable'}
                          </Text>
                        </View>
                        <TextInput style={[s.inp,{width:90,marginLeft:8}]} value={a.amount}
                          onChangeText={v=>{const arr=[...draft.allowances];arr[i].amount=v;setDraft(d=>({...d,allowances:arr}));}}
                          placeholder="0.00" keyboardType="decimal-pad"/>
                        <TouchableOpacity onPress={()=>setDraft(d=>({...d,allowances:d.allowances.filter((_,j)=>j!==i)}))} style={{paddingLeft:8}}>
                          <Text style={{color:C.red,fontSize:18}}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    <View style={{alignItems:'flex-end',paddingTop:6,borderTopWidth:1,borderTopColor:C.borderL}}>
                      <Text style={{fontSize:13,fontWeight:'800',color:C.navy}}>
                        Total: A${draft.allowances.reduce((sum,a)=>sum+(parseFloat(a.amount)||0),0).toFixed(2)}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* Action buttons */}
              <View style={{flexDirection:'row',gap:8,marginTop:4}}>
                <TouchableOpacity onPress={saveDraft} style={s.saveBtn}>
                  <Text style={s.saveBtnTxt}>Save Shift ✓</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={setDayOff} style={s.offBtn}>
                  <Text style={s.offBtnTxt}>Day Off</Text>
                </TouchableOpacity>
                {pickerDay!==null&&getShift(pickerDay)&&(
                  <TouchableOpacity onPress={deleteShift} style={s.delBtn}>
                    <Text style={{fontSize:16}}>🗑</Text>
                  </TouchableOpacity>
                )}
              </View>

            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══ ALLOWANCE CATALOG MODAL ═══════════════════════════════ */}
      <Modal visible={showAllowCatalog} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalSafe}>
          <ScrollView contentContainerStyle={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add Allowance</Text>
              <TouchableOpacity
                onPress={()=>{setShowAllowCatalog(false);setTimeout(()=>setPickerVisible(true),300);}}
                style={s.closeBtn}>
                <Text style={s.closeBtnTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* My presets */}
            {myAllowPresets.length>0&&<>
              <Text style={[s.sectionLbl,{color:C.teal,marginBottom:8}]}>⚡ MY PRESETS</Text>
              {myAllowPresets.map((p:any)=>(
                <TouchableOpacity key={p.id}
                  onPress={()=>{
                    setDraft(d=>({...d,allowances:[...d.allowances,{
                      id:uid(), name:p.name,
                      amount:p.defaultAmount!=null?String(p.defaultAmount):'',
                      taxable:p.taxable, color:p.color||C.teal,
                    }]}));
                    setShowAllowCatalog(false);
                    setTimeout(()=>setPickerVisible(true),300);
                  }}
                  style={[s.catalogItem,{borderColor:(p.color||C.teal)+'66',backgroundColor:(p.color||C.teal)+'18'}]}>
                  <View style={[s.allowDot,{backgroundColor:p.color||C.teal,width:12,height:12}]}/>
                  <View style={{flex:1}}>
                    <Text style={s.catalogItemTxt}>{p.name}</Text>
                    {p.defaultAmount!=null&&(
                      <Text style={{fontSize:10,color:C.muted,fontWeight:'600'}}>Default: A${p.defaultAmount} — auto-filled ✓</Text>
                    )}
                  </View>
                  <View style={[s.taxBadge,{backgroundColor:p.taxable?C.redL:C.greenL}]}>
                    <Text style={[s.taxBadgeTxt,{color:p.taxable?C.red:C.green}]}>{p.taxable?'Taxable':'Non-Tax'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <View style={{borderTopWidth:1,borderTopColor:C.borderL,marginVertical:12}}/>
            </>}

            {/* Full catalog */}
            <Text style={[s.sectionLbl,{marginBottom:8}]}>ALL ALLOWANCES</Text>
            {ALLOWANCE_CATALOG.map(cat=>(
              <TouchableOpacity key={cat.id}
                onPress={()=>{
                  setDraft(d=>({...d,allowances:[...d.allowances,{
                    id:uid(),
                    name:cat.name==='Custom Allowance'?'':cat.name,
                    amount:'', taxable:cat.taxable, color:cat.color,
                  }]}));
                  setShowAllowCatalog(false);
                  setTimeout(()=>setPickerVisible(true),300);
                }}
                style={[s.catalogItem,{borderColor:cat.color+'44',backgroundColor:cat.color+'0e'}]}>
                <View style={[s.allowDot,{backgroundColor:cat.color,width:12,height:12}]}/>
                <Text style={s.catalogItemTxt}>{cat.name}</Text>
                <View style={[s.taxBadge,{backgroundColor:cat.taxable?C.redL:C.greenL}]}>
                  <Text style={[s.taxBadgeTxt,{color:cat.taxable?C.red:C.green}]}>{cat.taxable?'Taxable':'Non-Tax'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ══ SHIFT DETAIL & SHARE MODAL ════════════════════════════ */}
      <Modal visible={detailDay!==null} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalSafe}>
          <ScrollView contentContainerStyle={s.modalContent}>
            {detailDay!==null&&detailShift&&!detailShift.off&&(()=>{
              const dow=DAYS[new Date(year,month,detailDay).getDay()];
              const allAmt=(detailShift.allowances||[]).reduce((sum:number,a:any)=>sum+(a.amount||0),0);
              return <>
                <View style={s.modalHeader}>
                  <View>
                    <Text style={s.modalTitle}>📅 {dow} {detailDay} {MONTHS[month]} {year}</Text>
                    <Text style={s.modalSub}>Shift details & share</Text>
                  </View>
                  <TouchableOpacity onPress={()=>setDetailDay(null)} style={s.closeBtn}>
                    <Text style={s.closeBtnTxt}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={[s.detailCard,{borderColor:(detailShift.penaltyColor||C.teal)+'66',backgroundColor:(detailShift.penaltyColor||C.teal)+'11'}]}>
                  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <Text style={{fontSize:22,fontWeight:'900',color:detailShift.penaltyColor||C.teal}}>{detailShift.start} – {detailShift.end}</Text>
                    <Text style={{fontSize:18,fontWeight:'900',color:C.navy}}>{detailShift.netHours}h</Text>
                  </View>
                  {(detailShift.penaltyMultiplier||1)>1&&(
                    <View style={[s.taxBadge,{backgroundColor:(detailShift.penaltyColor||C.teal)+'22',alignSelf:'flex-start',marginBottom:6}]}>
                      <Text style={[s.taxBadgeTxt,{color:detailShift.penaltyColor||C.teal}]}>⚡ {detailShift.penaltyLabel}</Text>
                    </View>
                  )}
                  {detailShift.label?<Text style={{fontSize:13,color:C.muted,fontWeight:'600',marginBottom:4}}>🏷 {detailShift.label}</Text>:null}
                  {(detailShift.allowances||[]).length>0&&(
                    <View style={{borderTopWidth:1,borderTopColor:(detailShift.penaltyColor||C.teal)+'33',paddingTop:8,marginTop:4}}>
                      {(detailShift.allowances||[]).map((a:any)=>(
                        <View key={a.id} style={{flexDirection:'row',justifyContent:'space-between',marginBottom:3}}>
                          <Text style={{fontSize:12,color:C.muted,fontWeight:'600'}}>{a.name}</Text>
                          <Text style={{fontSize:12,fontWeight:'700',color:C.navy}}>A${(a.amount||0).toFixed(2)}</Text>
                        </View>
                      ))}
                      <View style={{flexDirection:'row',justifyContent:'space-between',borderTopWidth:1,borderTopColor:C.borderL,paddingTop:5,marginTop:3}}>
                        <Text style={{fontSize:13,fontWeight:'800',color:C.navy}}>Total Allowances</Text>
                        <Text style={{fontSize:13,fontWeight:'900',color:C.green}}>A${allAmt.toFixed(2)}</Text>
                      </View>
                    </View>
                  )}
                </View>

                <View style={s.section}>
                  <Text style={s.sectionLbl}>Message preview</Text>
                  <View style={s.msgPreview}>
                    <Text style={{fontSize:13,color:C.text,lineHeight:20}}>{buildShareMsg(detailDay)}</Text>
                  </View>
                </View>

                <View style={s.section}>
                  <Text style={s.sectionLbl}>Send via</Text>
                  <View style={{gap:10}}>
                    {[
                      {label:'WhatsApp',          icon:'💬', bg:'#25D366', fn:()=>shareWhatsApp(detailDay!)},
                      {label:'Messages / SMS',     icon:'💬', bg:'#007AFF', fn:()=>shareSMS(detailDay!)},
                      {label:'Facebook Messenger', icon:'💬', bg:'#0084FF', fn:()=>shareFacebook(detailDay!)},
                      {label:'Email',              icon:'📧', bg:C.navy,    fn:()=>shareEmail(detailDay!)},
                      {label:'More options...',    icon:'📤', bg:C.bg,      fn:()=>shareViaSystem(detailDay!), light:true},
                    ].map((b:any)=>(
                      <TouchableOpacity key={b.label} onPress={b.fn}
                        style={[s.shareAppBtn,{backgroundColor:b.bg},b.light&&{borderWidth:1.5,borderColor:C.border}]}>
                        <Text style={s.shareAppIcon}>{b.icon}</Text>
                        <Text style={[s.shareAppTxt,b.light&&{color:C.navy}]}>{b.label}</Text>
                        <Text style={[s.shareAppArrow,b.light&&{color:C.navy}]}>→</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{flexDirection:'row',gap:8}}>
                  <TouchableOpacity onPress={()=>{setDetailDay(null);setTimeout(()=>openPicker(detailDay!),300);}} style={s.editBtn}>
                    <Text style={s.editBtnTxt}>✏️ Edit Shift</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={()=>setDetailDay(null)} style={s.offBtn}>
                    <Text style={s.offBtnTxt}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>;
            })()}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ══ UPGRADE MODAL ════════════════════════════════════ */}
      <Modal visible={showUpgrade} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalSafe}>
          <ScrollView contentContainerStyle={s.modalContent}>
            <TouchableOpacity onPress={()=>setShowUpgrade(false)} style={[s.closeBtn,{alignSelf:'flex-end'}]}>
              <Text style={s.closeBtnTxt}>✕</Text>
            </TouchableOpacity>

            <Text style={{fontSize:48,textAlign:'center',marginBottom:8}}>⭐</Text>
            <Text style={{fontSize:22,fontWeight:'900',color:C.navy,textAlign:'center',marginBottom:8}}>Upgrade to Pro</Text>
            <Text style={{fontSize:14,color:C.muted,textAlign:'center',marginBottom:24,lineHeight:20}}>
              You have used your 5 free roster days.

            </Text>

            <View style={{gap:12,marginBottom:20}}>
              {[
                '📅 Unlimited roster entries',
                '💰 Full payslip history',
                '👥 Multiple profiles',
                '📤 Share & export',
                '🌴 Leave tracking',
              ].map(f=>(
                <View key={f} style={{flexDirection:'row',alignItems:'center',gap:10}}>
                  <Text style={{fontSize:14}}>{f.split(' ')[0]}</Text>
                  <Text style={{fontSize:14,color:C.text,fontWeight:'600'}}>{f.split(' ').slice(1).join(' ')}</Text>
                </View>
              ))}
            </View>

            <View style={{flexDirection:'row',gap:12,marginBottom:16}}>
              <TouchableOpacity
                onPress={()=>{setPlan('pro5_monthly' as any);setShowUpgrade(false);}}
                style={{flex:1,backgroundColor:C.bg,borderRadius:14,padding:16,alignItems:'center',borderWidth:2,borderColor:C.border}}>
                <Text style={{fontSize:11,color:C.muted,fontWeight:'700',marginBottom:4}}>MONTHLY</Text>
                <Text style={{fontSize:26,fontWeight:'900',color:C.navy}}>$1.99</Text>
                <Text style={{fontSize:11,color:C.muted,fontWeight:'600'}}>per month</Text>
                <Text style={{fontSize:10,color:C.muted,marginTop:6}}>Cancel anytime</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={()=>{setPlan('pro5_lifetime' as any);setShowUpgrade(false);}}
                style={{flex:1,backgroundColor:C.navy,borderRadius:14,padding:16,alignItems:'center',borderWidth:2,borderColor:C.teal}}>
                <View style={{backgroundColor:C.teal,borderRadius:20,paddingHorizontal:10,paddingVertical:2,marginBottom:4}}>
                  <Text style={{fontSize:9,color:'#fff',fontWeight:'800'}}>BEST VALUE</Text>
                </View>
                <Text style={{fontSize:11,color:'rgba(255,255,255,0.6)',fontWeight:'700',marginBottom:4}}>ONE-TIME</Text>
                <Text style={{fontSize:26,fontWeight:'900',color:'#fff'}}>$49.99</Text>
                <Text style={{fontSize:11,color:'rgba(255,255,255,0.6)',fontWeight:'600'}}>lifetime access</Text>
                <Text style={{fontSize:10,color:C.teal,marginTop:6,fontWeight:'700'}}>Pay once · use forever</Text>
              </TouchableOpacity>
            </View>

            <Text style={{fontSize:11,color:C.muted,textAlign:'center',marginBottom:16}}>
              🔒 Secure · 7-day money back · Australian owned
            </Text>

            {/* Enterprise */}
            <TouchableOpacity
              onPress={()=>Linking.openURL('mailto:irradiatedsolution@gmail.com?subject=RosterPay AU Enterprise Enquiry&body=Hi, I need more than 20 profiles. Please contact me.')}
              style={{backgroundColor:'#F0F4FF',borderRadius:12,borderWidth:1.5,borderColor:'#CBD5E1',padding:14,alignItems:'center',marginBottom:10}}>
              <Text style={{color:'#1E3A5F',fontWeight:'800',fontSize:13}}>🏢 Need more than 20 profiles?</Text>
              <Text style={{color:'#64748B',fontWeight:'600',fontSize:11,marginTop:3}}>Contact us for Enterprise pricing</Text>
              <Text style={{color:'#0EA5A0',fontWeight:'700',fontSize:11,marginTop:2}}>irradiatedsolution@gmail.com</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={()=>setShowUpgrade(false)}
              style={{backgroundColor:C.bg,borderRadius:12,borderWidth:1.5,borderColor:C.border,padding:14,alignItems:'center'}}>
              <Text style={{color:C.muted,fontWeight:'700'}}>Maybe later</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},
  content:{padding:14,paddingBottom:40},
  nav:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:14},
  navBtn:{width:40,height:40,borderRadius:12,backgroundColor:C.white,borderWidth:1.5,borderColor:C.border,alignItems:'center',justifyContent:'center'},
  navArrow:{fontSize:22,color:C.navy,fontWeight:'800'},
  monthTitle:{fontSize:22,fontWeight:'900',color:C.navy,letterSpacing:-0.5},
  monthSub:{fontSize:11,color:C.muted,fontWeight:'600',marginTop:2},
  statsRow:{flexDirection:'row',gap:8,marginBottom:12},
  statCard:{flex:1,borderRadius:12,padding:10,alignItems:'center',borderWidth:1.5,borderColor:C.borderL},
  statIcon:{fontSize:16},
  statValue:{fontSize:15,fontWeight:'900',lineHeight:20},
  statLabel:{fontSize:9,color:C.muted,fontWeight:'700',marginTop:2},
  calCard:{backgroundColor:C.white,borderRadius:16,padding:10,borderWidth:1.5,borderColor:C.borderL,marginBottom:8},
  dayHeaders:{flexDirection:'row',marginBottom:4},
  dayHeader:{flex:1,textAlign:'center',fontSize:10,fontWeight:'800',paddingVertical:3},
  grid:{flexDirection:'row',flexWrap:'wrap'},
  emptyCell:{width:'14.285%',aspectRatio:0.75},
  cell:{width:'14.285%',aspectRatio:0.75,borderRadius:8,padding:3,alignItems:'center',backgroundColor:C.white,borderWidth:1,borderColor:C.borderL,marginBottom:3},
  cellWknd:{backgroundColor:'#FFF7F7'},
  cellDay:{fontSize:11,fontWeight:'700',color:C.navy,marginBottom:1},
  offLabel:{fontSize:8,color:C.muted,fontWeight:'800'},
  shiftTime:{fontSize:8,fontWeight:'800',textAlign:'center'},
  shiftNet:{fontSize:8,color:C.muted,fontWeight:'700'},
  penaltyBadge:{fontSize:8,fontWeight:'800'},
  allowAmt:{fontSize:8,color:C.green,fontWeight:'800'},
  shareBtn:{backgroundColor:C.teal,borderRadius:4,paddingHorizontal:4,paddingVertical:1,marginTop:1},
  shareBtnTxt:{fontSize:9,color:'#fff'},
  legendHint:{textAlign:'center',fontSize:10,color:C.muted,fontWeight:'600',marginTop:4},
  modalSafe:{flex:1,backgroundColor:C.white},
  modalContent:{padding:20,paddingBottom:40},
  modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16},
  modalTitle:{fontSize:17,fontWeight:'900',color:C.navy},
  modalSub:{fontSize:11,color:C.muted,fontWeight:'600',marginTop:2},
  closeBtn:{width:32,height:32,borderRadius:16,backgroundColor:C.bg,alignItems:'center',justifyContent:'center'},
  closeBtnTxt:{fontSize:16,color:C.muted,fontWeight:'700'},
  section:{marginBottom:16},
  sectionLbl:{fontSize:11,color:C.muted,fontWeight:'800',letterSpacing:0.4,marginBottom:8},
  presetChip:{borderRadius:20,borderWidth:2,paddingHorizontal:13,paddingVertical:7,alignItems:'center'},
  presetChipLbl:{fontWeight:'800',fontSize:13},
  presetChipSub:{fontSize:10,color:C.muted,fontWeight:'600',marginTop:1},
  lbl:{fontSize:10,color:C.muted,fontWeight:'700',marginBottom:4},
  inp:{backgroundColor:C.bg,borderRadius:8,borderWidth:1.5,borderColor:C.border,padding:10,fontSize:13,color:C.text},
  hoursPreview:{flexDirection:'row',gap:14,backgroundColor:C.tealL,borderRadius:10,padding:12,marginTop:10,borderWidth:1.5,borderColor:C.tealB,flexWrap:'wrap'},
  hpTxt:{fontSize:12,color:C.muted,fontWeight:'700'},
  penaltyOpt:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:11,borderWidth:1.5,borderColor:C.borderL,backgroundColor:C.bg},
  penaltyDot:{width:10,height:10,borderRadius:5},
  penaltyTxt:{flex:1,fontSize:13,color:C.text,fontWeight:'600'},
  addAllowBtn:{backgroundColor:C.tealL,borderRadius:8,borderWidth:1.5,borderColor:C.tealB,paddingHorizontal:12,paddingVertical:6},
  addAllowBtnTxt:{color:C.teal,fontWeight:'800',fontSize:12},
  emptyBox:{backgroundColor:C.bg,borderRadius:10,borderWidth:1.5,borderColor:C.border,padding:16,alignItems:'center'},
  allowRow:{flexDirection:'row',alignItems:'center',marginBottom:8,gap:6},
  allowDot:{width:10,height:10,borderRadius:2,marginTop:4},
  taxBadge:{borderRadius:20,paddingHorizontal:8,paddingVertical:3},
  taxBadgeTxt:{fontSize:10,fontWeight:'700'},
  saveBtn:{flex:1,backgroundColor:C.navy,borderRadius:12,padding:14,alignItems:'center'},
  saveBtnTxt:{color:'#fff',fontWeight:'800',fontSize:15},
  offBtn:{backgroundColor:C.bg,borderRadius:12,borderWidth:1.5,borderColor:C.border,padding:14,alignItems:'center',paddingHorizontal:14},
  offBtnTxt:{color:C.muted,fontWeight:'700'},
  delBtn:{backgroundColor:C.redL,borderRadius:12,borderWidth:1.5,borderColor:C.red+'44',padding:14,paddingHorizontal:14,alignItems:'center'},
  catalogItem:{flexDirection:'row',alignItems:'center',gap:10,padding:13,borderRadius:11,borderWidth:1.5,marginBottom:7},
  catalogItemTxt:{flex:1,fontSize:13,fontWeight:'700',color:C.text},
  detailCard:{borderRadius:16,padding:16,marginBottom:16,borderWidth:2},
  msgPreview:{backgroundColor:C.bg,borderRadius:12,padding:14,borderWidth:1.5,borderColor:C.borderL},
  shareAppBtn:{flexDirection:'row',alignItems:'center',gap:12,padding:14,borderRadius:13},
  shareAppIcon:{fontSize:20},
  shareAppTxt:{flex:1,color:'#fff',fontWeight:'800',fontSize:14},
  shareAppArrow:{color:'rgba(255,255,255,0.7)',fontSize:16,fontWeight:'700'},
  editBtn:{flex:1,backgroundColor:C.tealL,borderRadius:12,borderWidth:1.5,borderColor:C.tealB,padding:14,alignItems:'center'},
  editBtnTxt:{color:C.teal,fontWeight:'800',fontSize:14},
});