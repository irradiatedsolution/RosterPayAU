import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Keyboard, Modal, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePersonStore, useSubStore } from '../../src/store';
import { useIAP } from '../../src/hooks/useIAP';

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

const EMOJIS = ['👤','👩','👨','👩‍⚕️','👨‍⚕️','👩‍🍳','👨‍🍳','👩‍💼','👨‍💼','👩‍🔧','👨‍🔧','👩‍🏫','👨‍🏫','👩‍✈️','👨‍✈️','👮‍♀️','👮','💂‍♀️','💂','🧑‍🦱','🧑‍🦰','🧑‍🦳','🧑‍🦲','🧔','👱‍♀️','👱','🐨','🦘','⭐','🌟'];

function formatTimeInput(raw:string):string {
  const digits = raw.replace(/\D/g,'').slice(0,4);
  if(digits.length<=2) return digits;
  return digits.slice(0,2)+':'+digits.slice(2);
}

function formatAUDate(raw:string):string {
  const digits = raw.replace(/\D/g,'').slice(0,8);
  if(digits.length<=2) return digits;
  if(digits.length<=4) return digits.slice(0,2)+'/'+digits.slice(2);
  return digits.slice(0,2)+'/'+digits.slice(2,4)+'/'+digits.slice(4);
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
  const persons         = usePersonStore(s => s.persons);
  const activeId        = usePersonStore(s => s.activePersonId);
  const setActivePerson = usePersonStore(s => s.setActivePerson);
  const addPerson       = usePersonStore(s => s.addPerson);
  const removePerson    = usePersonStore(s => s.removePerson);
  const person          = usePersonStore(s => s.getActivePerson());
  const isPro           = useSubStore(s => s.isPro);
  const plan            = useSubStore.getState().subscription?.plan || 'free';
  const setPlan         = useSubStore(s => s.setPlan);
  const { purchasePackage, restorePurchases, packages, isLoading } = useIAP();

  const store = usePersonStore.getState();
  const {
    updatePerson,
    addWagePeriod, updateWagePeriod, removeWagePeriod,
    addShiftPreset, updateShiftPreset, removeShiftPreset,
    addAllowancePreset, updateAllowancePreset, removeAllowancePreset,
  } = store;

  const maxProfiles = plan==='pro20_monthly'||plan==='pro20_lifetime' ? 20
                    : plan==='pro5_monthly'||plan==='pro5_lifetime'   ? 5
                    : 1;

  const [showAddPerson, setShowAddPerson] = React.useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [showUpgrade, setShowUpgrade] = React.useState(false);

  if(!person) return <View style={s.safe}><Text>Loading...</Text></View>;
  const pid = person.id;

  function handleAddPerson(){
    if(persons.length >= maxProfiles){
      setShowUpgrade(true);
      return;
    }
    setShowAddPerson(true);
  }

  function confirmAddPerson(){
    if(!newName.trim()) return;
    addPerson(newName.trim(), 'self');
    setNewName('');
    setShowAddPerson(false);
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss}>
        <Text style={s.title}>⚙️ Settings</Text>

        {/* ── Profiles ── */}
        <View style={s.card}>
          <View style={s.cardHRow}>
            <Text style={s.cardTitle}>👥 Profiles</Text>
            <TouchableOpacity onPress={handleAddPerson} style={s.addBtn}>
              <Text style={s.addBtnTxt}>+ Add Person</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{flexDirection:'row',gap:8,paddingBottom:4}}>
              {persons.map(p=>(
                <TouchableOpacity key={p.id} onPress={()=>setActivePerson(p.id)}
                  style={[s.profileTab, p.id===activeId&&{borderColor:C.teal,backgroundColor:C.tealL}]}>
                  <Text style={s.profileTabIcon}>{p.emoji||'👤'}</Text>
                  <Text style={[s.profileTabName, p.id===activeId&&{color:C.teal,fontWeight:'800'}]}>{p.name||'No name'}</Text>
                  {persons.length>1&&p.id!==activeId&&(
                    <TouchableOpacity onPress={()=>{
                      Alert.alert('Remove Profile','Remove '+p.name+'?',[
                        {text:'Cancel',style:'cancel'},
                        {text:'Remove',style:'destructive',onPress:()=>removePerson(p.id)},
                      ]);
                    }} style={{marginTop:2}}>
                      <Text style={{fontSize:10,color:C.red,fontWeight:'700'}}>✕</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <Text style={{fontSize:10,color:C.muted,fontWeight:'600',marginTop:8}}>
            {persons.length}/{maxProfiles} profiles used · {plan==='free'?'Free plan':'Pro plan'}
          </Text>
        </View>

        {/* ── Profile Details ── */}
        <View style={s.card}>
          <View style={{flexDirection:'row',alignItems:'center',gap:12,marginBottom:12}}>
            <TouchableOpacity onPress={()=>setShowEmojiPicker(true)}
              style={{width:56,height:56,borderRadius:28,backgroundColor:C.tealL,borderWidth:2,borderColor:C.tealB,alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:30}}>{person.emoji||'👤'}</Text>
            </TouchableOpacity>
            <View>
              <Text style={s.cardTitle}>Profile Details</Text>
              <Text style={{fontSize:11,color:C.muted,fontWeight:'600'}}>Tap emoji to change</Text>
            </View>
          </View>
          <FInp label="Your Name"   value={person.name}       onChange={(v:string)=>updatePerson(pid,{name:v})}     placeholder="Full name"/>
          <FInp label="Employer"    value={person.employer}   onChange={(v:string)=>updatePerson(pid,{employer:v})} placeholder="Company name"/>
          <FInp label="Position"    value={person.position}   onChange={(v:string)=>updatePerson(pid,{position:v})} placeholder="e.g. Registered Nurse"/>
          <FInp label="Employee ID" value={person.employeeId} onChange={(v:string)=>updatePerson(pid,{employeeId:v})} placeholder="Optional"/>
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
              onChange={(v:string)=>updatePerson(pid,{contractHours:parseFloat(v)||0})}
              placeholder="e.g. 24" keyboardType="decimal-pad"/>
          )}
          <FPick label="Tax Residency" value={person.residency}
            options={['resident','foreign','whm']}
            labels={['AU Resident','Foreign Resident','Working Holiday']}
            onChange={(v:any)=>updatePerson(pid,{residency:v})}/>

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
              💡 The Monday your fortnightly pay cycle begins.
            </Text>
          </View>
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
            <Text style={s.hintTxt}>💡 Add a new period when your rate changes. Leave End blank for current rate.</Text>
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
            <Text style={s.hintTxt}>💡 Tap a preset in the roster to instantly fill times.</Text>
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
          {(person.shiftPresets||[]).filter(sp=>sp.label).length>0&&(
            <View style={s.previewBox}>
              <Text style={s.lbl}>Preview in roster:</Text>
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
            <Text style={s.hintTxt}>💡 Set default amounts — they auto-fill when adding to a shift.</Text>
          </View>
          {(person.allowancePresets||[]).map((ap,i)=>(
            <View key={ap.id} style={[s.presetRow,{borderLeftColor:ap.color||C.teal,alignItems:'flex-start'}]}>
              <View style={{flex:1,gap:8}}>
                <TextInput style={s.inp} value={ap.name}
                  onChangeText={v=>updateAllowancePreset(pid,ap.id,{name:v})}
                  placeholder="e.g. Night Shift Allowance"
                  returnKeyType="done"/>
                <View style={{flexDirection:'row',gap:8,alignItems:'center'}}>
                  <View style={{flex:1}}>
                    <Text style={s.lbl}>Default amount</Text>
                    <TextInput style={s.inp}
                      value={ap.defaultAmount!=null?String(ap.defaultAmount):''}
                      onChangeText={v=>updateAllowancePreset(pid,ap.id,{defaultAmount:v?parseFloat(v):null})}
                      placeholder="0.00" keyboardType="decimal-pad"
                      returnKeyType="done"/>
                  </View>
                  <TouchableOpacity onPress={()=>updateAllowancePreset(pid,ap.id,{taxable:!ap.taxable})}
                    style={[s.taxToggle,{backgroundColor:ap.taxable?C.redL:C.greenL}]}>
                    <Text style={[s.taxToggleTxt,{color:ap.taxable?C.red:C.green}]}>
                      {ap.taxable?'⚠️ Taxable':'✅ Non-Tax'}
                    </Text>
                  </TouchableOpacity>
                </View>
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

      {/* ── Emoji Picker Modal ── */}
      <Modal visible={showEmojiPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.safe}>
          <View style={{padding:24}}>
            <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <Text style={[s.cardTitle,{fontSize:18}]}>Choose Emoji</Text>
              <TouchableOpacity onPress={()=>setShowEmojiPicker(false)}>
                <Text style={{fontSize:20,color:C.muted}}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:12,justifyContent:'center'}}>
              {EMOJIS.map(e=>(
                <TouchableOpacity key={e} onPress={()=>{
                  updatePerson(pid,{emoji:e} as any);
                  setShowEmojiPicker(false);
                }}
                  style={{width:52,height:52,borderRadius:26,backgroundColor:person.emoji===e?C.tealL:C.bg,borderWidth:2,borderColor:person.emoji===e?C.teal:C.borderL,alignItems:'center',justifyContent:'center'}}>
                  <Text style={{fontSize:28}}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Add Person Modal ── */}
      <Modal visible={showAddPerson} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.safe}>
          <View style={{padding:24}}>
            <Text style={[s.cardTitle,{fontSize:18,marginBottom:16}]}>👤 Add New Profile</Text>
            <Text style={s.lbl}>Name</Text>
            <TextInput style={[s.inp,{marginBottom:16}]} value={newName}
              onChangeText={setNewName} placeholder="e.g. Jane Smith"
              autoFocus returnKeyType="done"/>
            <View style={{flexDirection:'row',gap:10}}>
              <TouchableOpacity onPress={confirmAddPerson}
                style={{flex:1,backgroundColor:C.navy,borderRadius:12,padding:14,alignItems:'center'}}>
                <Text style={{color:'#fff',fontWeight:'800',fontSize:15}}>Add Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>{setShowAddPerson(false);setNewName('');}}
                style={{flex:1,backgroundColor:C.bg,borderRadius:12,borderWidth:1.5,borderColor:C.border,padding:14,alignItems:'center'}}>
                <Text style={{color:C.muted,fontWeight:'700'}}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Upgrade Modal ── */}
      <Modal visible={showUpgrade} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.safe}>
          <ScrollView contentContainerStyle={{padding:24}}>
            <TouchableOpacity onPress={()=>setShowUpgrade(false)} style={{alignSelf:'flex-end',marginBottom:8}}>
              <Text style={{fontSize:20,color:C.muted}}>✕</Text>
            </TouchableOpacity>

            <Text style={{fontSize:44,textAlign:'center',marginBottom:8}}>⭐</Text>
            <Text style={{fontSize:22,fontWeight:'900',color:C.navy,textAlign:'center',marginBottom:8}}>Upgrade to Pro</Text>
            <Text style={{fontSize:14,color:C.muted,textAlign:'center',marginBottom:20,lineHeight:20}}>
              You have reached your profile limit.{'\n'}Upgrade to add more people.
            </Text>

            {[
              {title:'PRO 5',  sub:'Up to 5 profiles',  monthly:'$1.99/mo', lifetime:'$49.99 once', planM:'pro5_monthly',  planL:'pro5_lifetime',  best:false},
              {title:'PRO 20', sub:'Up to 20 profiles', monthly:'$3.99/mo', lifetime:'$99.99 once', planM:'pro20_monthly', planL:'pro20_lifetime', best:true},
            ].map((plan:any)=>(
              <View key={plan.title} style={{
                backgroundColor:plan.best?C.navy:C.bg,
                borderRadius:16,borderWidth:2,
                borderColor:plan.best?C.teal:C.border,
                padding:16,marginBottom:10,
              }}>
                {plan.best&&(
                  <View style={{backgroundColor:C.teal,borderRadius:20,paddingHorizontal:10,paddingVertical:2,alignSelf:'flex-start',marginBottom:8}}>
                    <Text style={{fontSize:9,color:'#fff',fontWeight:'800'}}>BEST VALUE</Text>
                  </View>
                )}
                <Text style={{fontSize:16,fontWeight:'900',color:plan.best?'#fff':C.navy,marginBottom:2}}>{plan.title}</Text>
                <Text style={{fontSize:12,color:plan.best?'rgba(255,255,255,0.6)':C.muted,fontWeight:'600',marginBottom:12}}>{plan.sub}</Text>
                <View style={{flexDirection:'row',gap:10}}>
                  <TouchableOpacity onPress={async()=>{
                      const pkg = packages.find(p=>p.product.identifier===plan.planM);
                      if(pkg){ const ok = await purchasePackage(pkg); if(ok) setShowUpgrade(false); }
                      else { setPlan(plan.planM as any); setShowUpgrade(false); }
                    }}
                    style={{flex:1,backgroundColor:plan.best?'rgba(255,255,255,0.1)':'#fff',borderRadius:12,padding:12,alignItems:'center',borderWidth:1.5,borderColor:plan.best?'rgba(255,255,255,0.2)':C.border}}>
                    <Text style={{fontSize:16,fontWeight:'900',color:plan.best?'#fff':C.navy}}>{plan.monthly}</Text>
                    <Text style={{fontSize:10,color:plan.best?'rgba(255,255,255,0.6)':C.muted}}>per month</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={async()=>{
                      const pkg = packages.find(p=>p.product.identifier===plan.planL);
                      if(pkg){ const ok = await purchasePackage(pkg); if(ok) setShowUpgrade(false); }
                      else { setPlan(plan.planL as any); setShowUpgrade(false); }
                    }}
                    style={{flex:1,backgroundColor:C.teal,borderRadius:12,padding:12,alignItems:'center'}}>
                    <Text style={{fontSize:16,fontWeight:'900',color:'#fff'}}>{plan.lifetime}</Text>
                    <Text style={{fontSize:10,color:'rgba(255,255,255,0.8)'}}>pay once · forever</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity
              onPress={()=>Linking.openURL('mailto:irradiatedsolution@gmail.com?subject=RosterPay AU Enterprise Enquiry&body=Hi, I need more than 20 profiles. Please contact me.')}
              style={{backgroundColor:C.bg,borderRadius:12,borderWidth:1.5,borderColor:C.border,padding:14,alignItems:'center',marginBottom:10}}>
              <Text style={{color:C.navy,fontWeight:'800',fontSize:13}}>🏢 Need more than 20 profiles?</Text>
              <Text style={{color:C.muted,fontWeight:'600',fontSize:11,marginTop:3}}>Contact us for Enterprise pricing</Text>
              <Text style={{color:C.teal,fontWeight:'700',fontSize:11,marginTop:2}}>irradiatedsolution@gmail.com</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={()=>setShowUpgrade(false)}
              style={{backgroundColor:C.bg,borderRadius:12,borderWidth:1.5,borderColor:C.border,padding:14,alignItems:'center'}}>
              <Text style={{color:C.muted,fontWeight:'700'}}>Maybe later</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Restore Purchases + EULA */}
      <View style={s.legalSection}>
        <TouchableOpacity
          style={s.restoreBtn}
          onPress={async () => {
            const ok = await restorePurchases();
            Alert.alert(ok ? 'Restored' : 'Nothing to Restore', ok ? 'Your purchases have been restored.' : 'No previous purchases found.');
          }}
        >
          <Text style={s.restoreBtnTxt}>Restore Purchases</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => Linking.openURL('https://irradiatedsolution.github.io/RosterPayAU/terms')}>
          <Text style={s.legalLink}>Terms of Use (EULA)</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => Linking.openURL('https://irradiatedsolution.github.io/RosterPayAU/privacy')}>
          <Text style={s.legalLink}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>

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

import React from 'react';

const s = StyleSheet.create({
  legalSection: { paddingHorizontal: 20, paddingVertical: 16, gap: 12, alignItems: 'center' },
  restoreBtn: { backgroundColor: '#1E3A5F', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32 },
  restoreBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  legalLink: { color: '#1E3A5F', fontSize: 13, textDecorationLine: 'underline' },
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
  profileTab:{borderRadius:14,borderWidth:1.5,borderColor:C.border,backgroundColor:C.bg,paddingHorizontal:14,paddingVertical:10,alignItems:'center',minWidth:80},
  profileTabIcon:{fontSize:20,marginBottom:3},
  profileTabName:{fontSize:11,fontWeight:'600',color:C.muted,textAlign:'center'},
});