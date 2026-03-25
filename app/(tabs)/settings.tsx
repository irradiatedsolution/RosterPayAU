import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Switch, Keyboard } from 'react-native';
import { usePersonStore, useSubStore } from '../../src/store';
import { Alert } from 'react-native';

const C = {
  bg:'#F0F4FF', white:'#FFFFFF', navy:'#1E3A5F',
  teal:'#0EA5A0', tealL:'#E0F7F6', tealB:'#9EDEDD',
  gold:'#F59E0B', goldL:'#FEF3C7',
  red:'#EF4444', redL:'#FEE2E2',
  green:'#10B981', greenL:'#D1FAE5',
  text:'#1E293B', muted:'#64748B',
  border:'#CBD5E1', borderL:'#E2E8F0',
};

const COLORS = ['#0EA5A0','#F97316','#7C3AED','#EF4444','#10B981','#3B82F6','#F59E0B','#EC4899','#06B6D4','#84CC16'];

function uid(){ return Math.random().toString(36).slice(2,9); }

function formatAUDate(raw:string):string {
  const digits = raw.replace(/\D/g,'').slice(0,8);
  if(digits.length<=2) return digits;
  if(digits.length<=4) return digits.slice(0,2)+'/'+digits.slice(2);
  return digits.slice(0,2)+'/'+digits.slice(2,4)+'/'+digits.slice(4);
}
function todayISO(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

function formatTimeInput(raw:string):string {
  const digits = raw.replace(/\D/g,'').slice(0,4);
  if(digits.length<=2) return digits;
  return digits.slice(0,2)+':'+digits.slice(2);
}

function calcNet(s:string,e:string,brk:string){
  if(!s||!e||!s.includes(':')) return '—';
  const[sh,sm]=s.split(':').map(Number);
  const[eh,em]=e.split(':').map(Number);
  if(isNaN(sh)||isNaN(sm)||isNaN(eh)||isNaN(em)) return '—';
  let diff=(eh*60+em)-(sh*60+sm); if(diff<=0)diff+=1440;
  return Math.max(0,(diff-(parseFloat(brk)||0))/60).toFixed(1);
}

export default function SettingsScreen() {
  const person = usePersonStore(s => s.getActivePerson());
  const store  = usePersonStore.getState();
  const {
    updatePerson,
    addWagePeriod, updateWagePeriod, removeWagePeriod,
    addShiftPreset, updateShiftPreset, removeShiftPreset,
    addAllowancePreset, updateAllowancePreset, removeAllowancePreset,
  } = store;

  if(!person) return <View style={s.safe}><Text>Loading...</Text></View>;

  const pid = person.id;

  return (
    <SafeAreaView style={s.safe}>
          <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss}>
            <Text style={s.title}>⚙️ Settings</Text>

            {/* ── Profile ── */}
            <View style={s.card}>
              <Text style={s.cardTitle}>👤 Profile</Text>
              <FInp label="Your Name"  value={person.name}     onChange={v=>updatePerson(pid,{name:v})}     placeholder="Full name"/>
              <FInp label="Employer"   value={person.employer} onChange={v=>updatePerson(pid,{employer:v})} placeholder="Company name"/>
              <FInp label="Position"   value={person.position} onChange={v=>updatePerson(pid,{position:v})} placeholder="e.g. Registered Nurse"/>
              <FInp label="Employee ID" value={person.employeeId} onChange={v=>updatePerson(pid,{employeeId:v})} placeholder="Optional"/>
              <View style={{flexDirection:'row',gap:8}}>
                <View style={{flex:1}}>
                  <FPick label="Pay Frequency" value={person.payFreq}
                    options={['weekly','fortnightly','4-weekly','monthly']}
                    labels={['Weekly','Fortnightly','4-Weekly','Monthly']}
                    onChange={(v:any)=>updatePerson(pid,{payFreq:v})}/>
                </View>
                <View style={{flex:1}}>
                  <FPick label="Employment" value={person.employmentType}
                    options={['fulltime','parttime','shiftworker','casual']}
                    labels={['Full-Time','Part-Time','Shift Worker','Casual']}
                    onChange={(v:any)=>updatePerson(pid,{employmentType:v})}/>
                </View>
              </View>
              {person.employmentType==='parttime'&&(
                <FInp label="Contracted hours/week" value={String(person.contractHours||'')}
                  onChange={v=>updatePerson(pid,{contractHours:parseFloat(v)||0})}
                  placeholder="e.g. 24" keyboardType="decimal-pad"/>
              )}
              {/* Pay Period Start Date */}
              <View style={{marginBottom:10}}>
                <Text style={s.lbl}>Pay Period Start Date</Text>
                <TextInput style={s.inp}
                  value={person.payPeriodStartDate||''}
                  onChangeText={v=>updatePerson(pid,{payPeriodStartDate:formatAUDate(v)})}
                  placeholder="DD/MM/YYYY (e.g. 17/03/2025)"
                  keyboardType="number-pad"
                  maxLength={10}
                  returnKeyType="done"/>
                <Text style={{fontSize:10,color:C.muted,marginTop:4,fontWeight:'600'}}>
                  💡 The start date of your first pay period. For fortnightly: enter the Monday your pay cycle begins. Format: DD/MM/YYYY
                </Text>
              </View>

              <FPick label="Tax Residency" value={person.residency}
                options={['resident','foreign','whm']}
                labels={['AU Resident','Foreign Resident','Working Holiday']}
                onChange={(v:any)=>updatePerson(pid,{residency:v})}/>
            </View>

            {/* ── Wage History ── */}
            <View style={s.card}>
              <View style={s.cardHRow}>
                <Text style={s.cardTitle}>💵 Wage History</Text>
                <TouchableOpacity onPress={()=>addWagePeriod(pid)} style={s.addBtn}>
                  <Text style={s.addBtnTxt}>+ Add Period</Text>
                </TouchableOpacity>
              </View>
              <View style={s.hintBox}>
                <Text style={s.hintTxt}>💡 Add a new period when your rate changes. Leave End blank for current rate. Correct rate auto-applies per day in roster.</Text>
              </View>
              {(person.wageHistory||[]).map((w,i)=>(
                <View key={w.id} style={s.wagePeriod}>
                  <View style={s.wagePeriodTop}>
                    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                      <View style={[s.dot,{backgroundColor:w.to===null?C.green:C.muted}]}/>
                      <Text style={s.wagePeriodTitle}>{w.to===null?'Current Rate':'Past Rate'}</Text>
                      {w.to===null&&<View style={s.activeBadge}><Text style={s.activeBadgeTxt}>Active</Text></View>}
                    </View>
                    {(person.wageHistory||[]).length>1&&(
                      <TouchableOpacity onPress={()=>removeWagePeriod(pid,w.id)}>
                        <Text style={{color:C.red,fontWeight:'700',fontSize:12}}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={{gap:8}}>
                    <View style={{flexDirection:'row',gap:8}}>
                      <View style={{flex:1}}>
                        <Text style={s.lbl}>From date</Text>
                        <TextInput style={s.inp} value={w.from}
                          onChangeText={v=>updateWagePeriod(pid,w.id,{from:v})}
                          placeholder="YYYY-MM-DD"/>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={s.lbl}>To date (blank = ongoing)</Text>
                        <TextInput style={s.inp} value={w.to||''}
                          onChangeText={v=>updateWagePeriod(pid,w.id,{to:v||null})}
                          placeholder="Ongoing"/>
                      </View>
                    </View>
                    <View>
                      <Text style={s.lbl}>Hourly rate (AUD)</Text>
                      <TextInput style={s.inp} value={String(w.rate||'')}
                        onChangeText={v=>updateWagePeriod(pid,w.id,{rate:parseFloat(v)||0})}
                        placeholder="0.00" keyboardType="decimal-pad"/>
                    </View>
                  </View>
                  <View style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:8}}>
                    <Switch value={w.casual||false}
                      onValueChange={v=>updateWagePeriod(pid,w.id,{casual:v})}
                      trackColor={{true:C.teal}}/>
                    <Text style={{fontSize:12,color:C.text,fontWeight:'700'}}>Casual Loading +25%</Text>
                    {w.rate>0&&<Text style={{fontSize:11,color:C.teal,fontWeight:'700',marginLeft:'auto'}}>
                      A${(w.rate*(w.casual?1.25:1)).toFixed(2)}/hr
                    </Text>}
                  </View>
                </View>
              ))}
            </View>

            {/* ── Shift Presets ── */}
            <View style={s.card}>
              <View style={s.cardHRow}>
                <Text style={s.cardTitle}>🕐 Shift Presets</Text>
                <TouchableOpacity onPress={()=>addShiftPreset(pid)} style={s.addBtn}>
                  <Text style={s.addBtnTxt}>+ Add</Text>
                </TouchableOpacity>
              </View>
              <View style={s.hintBox}>
                <Text style={s.hintTxt}>💡 Tap a preset in the roster to instantly fill times. These are saved and shared with the Roster screen.</Text>
              </View>
              {(person.shiftPresets||[]).map((sp,i)=>(
                <View key={sp.id} style={[s.presetRow,{borderLeftColor:sp.color||C.teal}]}>
                  <View style={{flex:1,gap:6}}>
                    <TextInput style={[s.inp,{fontWeight:'700'}]} value={sp.label}
                      onChangeText={v=>updateShiftPreset(pid,sp.id,{label:v})}
                      placeholder="Shift name e.g. 7–4pm"/>
                    <View style={{flexDirection:'row',gap:8}}>
                      <View style={{flex:1}}>
                        <Text style={s.lbl}>Start</Text>
                        <TextInput style={s.inp} value={sp.start}
                          onChangeText={v=>updateShiftPreset(pid,sp.id,{start:formatTimeInput(v)})}
                          placeholder="07:00" keyboardType="number-pad" maxLength={5}/>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={s.lbl}>End</Text>
                        <TextInput style={s.inp} value={sp.end}
                          onChangeText={v=>updateShiftPreset(pid,sp.id,{end:formatTimeInput(v)})}
                          placeholder="15:00" keyboardType="number-pad" maxLength={5}/>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={s.lbl}>Break (mins)</Text>
                        <TextInput style={s.inp} value={String(sp.brk||'')}
                          onChangeText={v=>updateShiftPreset(pid,sp.id,{brk:parseFloat(v)||0})}
                          placeholder="30" keyboardType="decimal-pad"/>
                      </View>
                      <View style={{width:46,alignItems:'center'}}>
                        <Text style={s.lbl}>Net</Text>
                        <Text style={[s.netHrs,{color:sp.color||C.teal}]}>
                          {calcNet(sp.start,sp.end,String(sp.brk||0))}h
                        </Text>
                      </View>
                    </View>
                    {/* Colour picker */}
                    <View>
                      <Text style={s.lbl}>Colour</Text>
                      <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
                        {COLORS.map(c=>(
                          <TouchableOpacity key={c} onPress={()=>updateShiftPreset(pid,sp.id,{color:c})}
                            style={[s.colorDot,{backgroundColor:c},(sp.color||C.teal)===c&&s.colorDotSel]}/>
                        ))}
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity onPress={()=>removeShiftPreset(pid,sp.id)} style={{paddingLeft:8,paddingTop:4}}>
                    <Text style={{color:C.red,fontSize:20}}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* Preview */}
              {(person.shiftPresets||[]).filter(sp=>sp.label).length>0&&(
                <View style={s.previewBox}>
                  <Text style={s.lbl}>Preview in roster picker:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{flexDirection:'row',gap:8,paddingTop:6}}>
                      {(person.shiftPresets||[]).filter(sp=>sp.label).map(sp=>(
                        <View key={sp.id} style={[s.previewChip,{borderColor:sp.color||C.teal,backgroundColor:(sp.color||C.teal)+'18'}]}>
                          <Text style={[s.previewChipLbl,{color:sp.color||C.teal}]}>{sp.label}</Text>
                          <Text style={s.previewChipSub}>{sp.start}–{sp.end} · {calcNet(sp.start,sp.end,String(sp.brk||0))}h</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>

            {/* ── Allowance Presets ── */}
            <View style={s.card}>
              <View style={s.cardHRow}>
                <Text style={s.cardTitle}>⚡ Allowance Presets</Text>
                <TouchableOpacity onPress={()=>addAllowancePreset(pid)} style={s.addBtn}>
                  <Text style={s.addBtnTxt}>+ Add</Text>
                </TouchableOpacity>
              </View>
              <View style={s.hintBox}>
                <Text style={s.hintTxt}>💡 Set default amounts — they auto-fill when you add an allowance to a shift in the roster.</Text>
              </View>

              {(person.allowancePresets||[]).map((ap,i)=>(
                <View key={ap.id} style={[s.presetRow,{borderLeftColor:ap.color||C.teal,alignItems:'flex-start'}]}>
                  <View style={{flex:1,gap:8}}>
                    <TextInput style={s.inp} value={ap.name}
                      onChangeText={v=>updateAllowancePreset(pid,ap.id,{name:v})}
                      placeholder="e.g. Night Shift Allowance"
                      returnKeyType="done" onSubmitEditing={Keyboard.dismiss}/>
                    <View style={{flexDirection:'row',gap:8,alignItems:'center'}}>
                      <View style={{flex:1}}>
                        <Text style={s.lbl}>Default amount</Text>
                        <TextInput style={s.inp}
                          value={ap.defaultAmount!=null?String(ap.defaultAmount):''}
                          onChangeText={v=>updateAllowancePreset(pid,ap.id,{defaultAmount:v?parseFloat(v):null})}
                          placeholder="0.00" keyboardType="decimal-pad"
                          returnKeyType="done" onSubmitEditing={Keyboard.dismiss}/>
                      </View>
                      <TouchableOpacity onPress={()=>updateAllowancePreset(pid,ap.id,{taxable:!ap.taxable})}
                        style={[s.taxToggle,{backgroundColor:ap.taxable?C.redL:C.greenL}]}>
                        <Text style={[s.taxToggleTxt,{color:ap.taxable?C.red:C.green}]}>
                          {ap.taxable?'⚠️ Taxable':'✅ Non-Tax'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {/* Colour picker */}
                    <View>
                      <Text style={s.lbl}>Colour</Text>
                      <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
                        {COLORS.map(c=>(
                          <TouchableOpacity key={c} onPress={()=>updateAllowancePreset(pid,ap.id,{color:c})}
                            style={[s.colorDot,{backgroundColor:c},(ap.color||C.teal)===c&&s.colorDotSel]}/>
                        ))}
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity onPress={()=>removeAllowancePreset(pid,ap.id)} style={{paddingLeft:8,paddingTop:4}}>
                    <Text style={{color:C.red,fontSize:20}}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>


          </ScrollView>
    </SafeAreaView>
  );
}

function FInp({label,value,onChange,placeholder,keyboardType='default'}:any){
  return <View style={{marginBottom:10}}>
    <Text style={s.lbl}>{label}</Text>
    <TextInput style={s.inp} value={value} onChangeText={onChange}
      placeholder={placeholder} keyboardType={keyboardType}
      returnKeyType="done" onSubmitEditing={Keyboard.dismiss}/>
  </View>;
}

function FPick({label,value,options,labels,onChange}:any){
  return <View style={{marginBottom:10}}>
    <Text style={s.lbl}>{label}</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
      {options.map((o:string,i:number)=>(
        <TouchableOpacity key={o} onPress={()=>onChange(o)}
          style={[s.pickOpt,value===o&&{backgroundColor:C.tealL,borderColor:C.teal}]}>
          <Text style={[s.pickOptTxt,value===o&&{color:C.teal,fontWeight:'800'}]}>{labels[i]}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>;
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},
  content:{padding:14,paddingBottom:60},
  title:{fontSize:20,fontWeight:'900',color:C.navy,marginBottom:16},
  card:{backgroundColor:C.white,borderRadius:16,padding:16,marginBottom:12,borderWidth:1.5,borderColor:C.borderL},
  cardTitle:{fontSize:14,fontWeight:'800',color:C.navy,marginBottom:12},
  cardHRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},
  addBtn:{backgroundColor:C.tealL,borderRadius:8,borderWidth:1.5,borderColor:C.tealB,paddingHorizontal:12,paddingVertical:6},
  addBtnTxt:{color:C.teal,fontWeight:'800',fontSize:12},
  hintBox:{backgroundColor:C.bg,borderRadius:10,padding:10,marginBottom:12},
  hintTxt:{fontSize:11,color:C.muted,fontWeight:'600',lineHeight:16},
  lbl:{fontSize:10,color:C.muted,fontWeight:'700',marginBottom:4},
  inp:{backgroundColor:C.bg,borderRadius:8,borderWidth:1.5,borderColor:C.border,padding:10,fontSize:13,color:C.text},
  wagePeriod:{backgroundColor:C.bg,borderRadius:12,padding:12,marginBottom:10,borderWidth:1,borderColor:C.borderL},
  wagePeriodTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},
  wagePeriodTitle:{fontSize:13,fontWeight:'800',color:C.navy},
  dot:{width:8,height:8,borderRadius:4},
  activeBadge:{backgroundColor:C.greenL,borderRadius:20,paddingHorizontal:8,paddingVertical:2},
  activeBadgeTxt:{fontSize:10,color:C.green,fontWeight:'700'},
  presetRow:{flexDirection:'row',alignItems:'flex-start',gap:8,backgroundColor:C.bg,borderRadius:12,padding:12,borderLeftWidth:3,marginBottom:10},
  netHrs:{fontSize:15,fontWeight:'900',marginTop:8},
  colorDot:{width:26,height:26,borderRadius:13,borderWidth:2,borderColor:'transparent'},
  colorDotSel:{borderColor:C.navy,transform:[{scale:1.2}]},
  taxToggle:{borderRadius:8,paddingHorizontal:12,paddingVertical:10,alignItems:'center'},
  taxToggleTxt:{fontSize:11,fontWeight:'800'},
  pickOpt:{borderRadius:20,borderWidth:1.5,borderColor:C.border,backgroundColor:C.bg,paddingHorizontal:12,paddingVertical:6},
  pickOptTxt:{fontSize:12,color:C.muted,fontWeight:'600'},
  previewBox:{backgroundColor:C.bg,borderRadius:10,padding:12,marginTop:6,borderWidth:1,borderColor:C.borderL},
  previewChip:{borderRadius:20,borderWidth:2,paddingHorizontal:13,paddingVertical:7,alignItems:'center'},
  previewChipLbl:{fontWeight:'800',fontSize:12},
  previewChipSub:{fontSize:10,color:C.muted,fontWeight:'600',marginTop:1},
});