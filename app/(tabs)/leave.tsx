import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput } from 'react-native';
import { useState } from 'react';

const C = {
  bg:'#F0F4FF', white:'#FFFFFF', navy:'#1E3A5F',
  teal:'#0EA5A0', tealL:'#E0F7F6', tealB:'#9EDEDD',
  gold:'#F59E0B', goldL:'#FEF3C7',
  red:'#EF4444', redL:'#FEE2E2',
  green:'#10B981', greenL:'#D1FAE5',
  purple:'#7C3AED', purpleL:'#EDE9FE',
  orange:'#F97316', orangeL:'#FFEDD5',
  text:'#1E293B', muted:'#64748B',
  border:'#CBD5E1', borderL:'#E2E8F0',
};

const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const LEAVE_RULES:any = {
  fulltime:   { weeks:4, hpw:38,   label:'Full-Time',           desc:'4 weeks (152h) per year' },
  parttime:   { weeks:4, hpw:null, label:'Part-Time (pro-rata)', desc:'4 weeks pro-rata on contracted hours' },
  shiftworker:{ weeks:5, hpw:38,   label:'Shift Worker',         desc:'5 weeks (190h) per year — 7-day roster' },
  casual:     { weeks:0, hpw:0,    label:'Casual',               desc:'No paid leave — 25% casual loading instead' },
};

const LSL_RULES:any = {
  VIC:{ minYears:7,   weeksAt7:6.06,  weeksAt:null,  atYears:null,  act:'Long Service Leave Act 2018 (VIC)',    note:'After 7 years: 6.06 weeks. Pro-rata available after 7 years.' },
  NSW:{ minYears:10,  weeksAt7:null,  weeksAt:2*52/12*2, atYears:10, act:'Long Service Leave Act 1955 (NSW)',   note:'2 months after 10 years. Pro-rata on termination after 1 year.' },
  QLD:{ minYears:10,  weeksAt7:null,  weeksAt:8.6667, atYears:10,   act:'Industrial Relations Act 2016 (QLD)',  note:'8.667 weeks after 10 years.' },
  WA: { minYears:10,  weeksAt7:null,  weeksAt:8.6667, atYears:10,   act:'Long Service Leave Act 1958 (WA)',     note:'8.667 weeks after 10 years.' },
  SA: { minYears:10,  weeksAt7:null,  weeksAt:9.3333, atYears:10,   act:'Fair Work Act 1994 (SA)',              note:'9.33 weeks after 10 years.' },
  TAS:{ minYears:10,  weeksAt7:null,  weeksAt:8.6667, atYears:10,   act:'Long Service Leave Act 1976 (TAS)',    note:'8.667 weeks after 10 years.' },
  ACT:{ minYears:7,   weeksAt7:6.06,  weeksAt:null,  atYears:null,  act:'Long Service Leave Act 1976 (ACT)',    note:'6.06 weeks after 7 years. Similar to VIC.' },
  NT: { minYears:10,  weeksAt7:null,  weeksAt:8.6667, atYears:10,   act:'Long Service Leave Act 1981 (NT)',     note:'8.667 weeks after 10 years.' },
};

const STATES = ['VIC','NSW','QLD','WA','SA','TAS','ACT','NT'];

export default function LeaveScreen() {
  const today = new Date();
  const month = today.getMonth();

  const [empType, setEmpType]             = useState('fulltime');
  const [state, setState]                 = useState('VIC');
  const [contractHours, setContractHours] = useState('38');
  const [hoursWorked, setHoursWorked]     = useState('');
  const [leaveBalance, setLeaveBalance]   = useState('');
  const [hourlyRate, setHourlyRate]       = useState('');
  const [yearsWorked, setYearsWorked]     = useState('');
  const [sickBalance, setSickBalance]     = useState('');
  const [activeTab, setActiveTab]         = useState<'annual'|'sick'|'lsl'>('annual');

  const rule = LEAVE_RULES[empType];
  const lslRule = LSL_RULES[state];
  const isCasual = empType === 'casual';
  const hpw = empType === 'parttime' ? (parseFloat(contractHours)||0) : (rule.hpw||38);
  const annualHours = rule.weeks * hpw;
  const accrualPerHour = hpw > 0 ? annualHours / (52 * hpw) : 0;
  const worked = parseFloat(hoursWorked)||0;
  const monthlyAccrual = +(accrualPerHour * worked).toFixed(2);
  const balance = parseFloat(leaveBalance)||0;
  const totalBalance = +(balance + monthlyAccrual).toFixed(2);
  const hpd = hpw / 5;
  const totalDays = hpd > 0 ? +(totalBalance / hpd).toFixed(1) : 0;
  const rate = parseFloat(hourlyRate)||0;
  const leaveLoading = rate > 0 ? rate * annualHours * 0.175 : 0;

  // Sick leave — 10 days/yr for full/part time
  const sickHoursPerYear = isCasual ? 0 : (empType==='parttime' ? (parseFloat(contractHours)||0)*10/5 : 76);
  const sickAccrualPerHour = hpw > 0 && !isCasual ? sickHoursPerYear / (52 * hpw) : 0;
  const sickMonthlyAccrual = +(sickAccrualPerHour * worked).toFixed(2);
  const sickBal = parseFloat(sickBalance)||0;
  const totalSick = +(sickBal + sickMonthlyAccrual).toFixed(2);
  const sickDays = hpd > 0 ? +(totalSick / hpd).toFixed(1) : 0;

  // LSL
  const years = parseFloat(yearsWorked)||0;
  const lslEligible = years >= lslRule.minYears;
  const lslWeeks = lslRule.weeksAt7 ? (lslRule.weeksAt7 / lslRule.minYears) * years : (lslRule.weeksAt / lslRule.atYears) * years;
  const lslHours = +(lslWeeks * hpw).toFixed(1);
  const lslPay = rate > 0 ? +(lslHours * rate).toFixed(2) : 0;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>🌴 Leave Calculator</Text>
        <Text style={s.sub}>Fair Work Act 2009 · {state}</Text>

        {/* Employment & State */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Employment Type</Text>
          <View style={s.typeGrid}>
            {Object.entries(LEAVE_RULES).map(([key,val]:any)=>(
              <TouchableOpacity key={key} onPress={()=>setEmpType(key)}
                style={[s.typeBtn,empType===key&&{borderColor:C.teal,backgroundColor:C.tealL}]}>
                <Text style={[s.typeBtnLabel,empType===key&&{color:C.teal,fontWeight:'800'}]}>{val.label}</Text>
                <Text style={s.typeBtnSub}>{val.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {empType==='parttime'&&(
            <View style={{marginTop:10}}>
              <Text style={s.label}>Contracted Hours / Week</Text>
              <TextInput style={s.input} value={contractHours} onChangeText={setContractHours} placeholder="e.g. 24" keyboardType="decimal-pad"/>
            </View>
          )}
          <View style={{marginTop:12}}>
            <Text style={s.label}>State / Territory</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{flexDirection:'row',gap:6}}>
                {STATES.map(st=>(
                  <TouchableOpacity key={st} onPress={()=>setState(st)}
                    style={[s.stateBtn,state===st&&{backgroundColor:C.navy,borderColor:C.navy}]}>
                    <Text style={[s.stateBtnText,state===st&&{color:'#fff',fontWeight:'800'}]}>{st}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Inputs */}
        {!isCasual&&(
          <View style={s.card}>
            <Text style={s.cardTitle}>📊 Your Details</Text>
            <View style={s.row}>
              <View style={{flex:1,marginRight:8}}>
                <Text style={s.label}>Hours Worked ({MONTHS_S[month]})</Text>
                <TextInput style={s.input} value={hoursWorked} onChangeText={setHoursWorked} placeholder="0.0" keyboardType="decimal-pad"/>
              </View>
              <View style={{flex:1}}>
                <Text style={s.label}>Hourly Rate (AUD)</Text>
                <TextInput style={s.input} value={hourlyRate} onChangeText={setHourlyRate} placeholder="0.00" keyboardType="decimal-pad"/>
              </View>
            </View>
            <View style={{marginTop:8}}>
              <Text style={s.label}>Years with Current Employer</Text>
              <TextInput style={s.input} value={yearsWorked} onChangeText={setYearsWorked} placeholder="e.g. 3.5" keyboardType="decimal-pad"/>
            </View>
          </View>
        )}

        {isCasual?(
          <View style={s.card}>
            <Text style={{fontSize:36,textAlign:'center',marginBottom:10}}>ℹ️</Text>
            <Text style={[s.cardTitle,{textAlign:'center'}]}>No Paid Leave for Casuals</Text>
            <Text style={{fontSize:13,color:C.muted,textAlign:'center',lineHeight:19}}>Casual employees receive 25% casual loading in lieu of paid leave entitlements under the Fair Work Act.</Text>
          </View>
        ):<>

          {/* Tab selector */}
          <View style={s.tabRow}>
            {([['annual','🌴 Annual'],['sick','🤒 Sick/Carer\'s'],['lsl','⭐ Long Service']] as const).map(([id,label])=>(
              <TouchableOpacity key={id} onPress={()=>setActiveTab(id)}
                style={[s.tab,activeTab===id&&{backgroundColor:C.navy,borderColor:C.navy}]}>
                <Text style={[s.tabText,activeTab===id&&{color:'#fff',fontWeight:'800'}]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ANNUAL LEAVE */}
          {activeTab==='annual'&&<>
            <View style={s.row}>
              {[
                {icon:'🌴',label:'Balance',value:`${totalBalance}h`,sub:`≈ ${totalDays} days`,color:C.purple,bg:C.purpleL},
                {icon:'📈',label:`Accrued (${MONTHS_S[month]})`,value:`${monthlyAccrual}h`,sub:`${accrualPerHour.toFixed(4)} h/hr`,color:C.green,bg:C.greenL},
                {icon:'📅',label:'Entitlement',value:`${annualHours}h`,sub:`${rule.weeks} wks/yr`,color:C.teal,bg:C.tealL},
              ].map(stat=>(
                <View key={stat.label} style={[s.statCard,{backgroundColor:stat.bg}]}>
                  <Text style={s.statIcon}>{stat.icon}</Text>
                  <Text style={[s.statValue,{color:stat.color}]}>{stat.value}</Text>
                  <Text style={s.statLabel}>{stat.label}</Text>
                  <Text style={s.statSub}>{stat.sub}</Text>
                </View>
              ))}
            </View>
            <View style={s.card}>
              <Text style={s.cardTitle}>Current Leave Balance</Text>
              <Text style={s.label}>Hours from employer payslip</Text>
              <TextInput style={s.input} value={leaveBalance} onChangeText={setLeaveBalance} placeholder="e.g. 76.0" keyboardType="decimal-pad"/>
              <Text style={{fontSize:10,color:C.muted,marginTop:6,fontWeight:'600'}}>💡 This month's accrual ({monthlyAccrual}h) is added automatically.</Text>
            </View>
            {rate>0&&(
              <View style={s.card}>
                <Text style={s.cardTitle}>💰 Leave Loading (17.5%)</Text>
                <View style={[s.loadingBox,{backgroundColor:C.goldL,borderColor:C.borderL}]}>
                  <Text style={[s.loadingDesc,{color:C.navy}]}>17.5% loading on base pay when taking annual leave. Check your Modern Award.</Text>
                  <View style={{alignItems:'flex-end'}}>
                    <Text style={s.loadingAmtLabel}>Est. Loading</Text>
                    <Text style={[s.loadingAmt,{color:C.gold}]}>A${leaveLoading.toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2})}</Text>
                  </View>
                </View>
              </View>
            )}
          </>}

          {/* SICK LEAVE */}
          {activeTab==='sick'&&<>
            <View style={s.card}>
              <Text style={s.cardTitle}>🤒 Personal / Carer's Leave</Text>
              <Text style={{fontSize:12,color:C.muted,marginBottom:14,lineHeight:17,fontWeight:'600'}}>Under Fair Work Act s.96 — 10 days per year for full-time employees. Pro-rata for part-time. Includes sick leave and carer's leave.</Text>
              <View style={s.row}>
                {[
                  {icon:'🤒',label:'Sick Balance',value:`${totalSick}h`,sub:`≈ ${sickDays} days`,color:C.red,bg:C.redL},
                  {icon:'📈',label:`Accrued (${MONTHS_S[month]})`,value:`${sickMonthlyAccrual}h`,sub:`${sickAccrualPerHour.toFixed(4)} h/hr`,color:C.orange,bg:C.orangeL},
                  {icon:'📅',label:'Annual Entitlement',value:`${sickHoursPerYear}h`,sub:'10 days/yr',color:C.green,bg:C.greenL},
                ].map(stat=>(
                  <View key={stat.label} style={[s.statCard,{backgroundColor:stat.bg}]}>
                    <Text style={s.statIcon}>{stat.icon}</Text>
                    <Text style={[s.statValue,{color:stat.color}]}>{stat.value}</Text>
                    <Text style={s.statLabel}>{stat.label}</Text>
                    <Text style={s.statSub}>{stat.sub}</Text>
                  </View>
                ))}
              </View>
              <View style={{marginTop:12}}>
                <Text style={s.label}>Current Sick Leave Balance (hours)</Text>
                <TextInput style={s.input} value={sickBalance} onChangeText={setSickBalance} placeholder="e.g. 38.0" keyboardType="decimal-pad"/>
              </View>
            </View>
            <View style={s.card}>
              <Text style={s.cardTitle}>📋 Sick Leave Rules (Fair Work Act)</Text>
              {[
                ['Entitlement','10 days paid personal/carer\'s leave per year (s.96)'],
                ['Part-Time','Pro-rata based on contracted hours'],
                ['Casual','Not entitled to paid sick leave'],
                ['Accrual','Accrues progressively, unused leave carries over'],
                ['Evidence','Employer can request medical certificate'],
                ['Carer\'s Leave','Can use sick leave to care for family member'],
                ['Unpaid Carer\'s','2 days unpaid per occasion if sick leave exhausted'],
              ].map(([k,v],i,arr)=>(
                <View key={k} style={[s.ruleRow,i<arr.length-1&&{borderBottomWidth:1,borderBottomColor:C.borderL}]}>
                  <Text style={s.ruleKey}>{k}</Text>
                  <Text style={s.ruleVal}>{v}</Text>
                </View>
              ))}
            </View>
          </>}

          {/* LONG SERVICE LEAVE */}
          {activeTab==='lsl'&&<>
            <View style={[s.card,{borderColor:lslEligible?C.gold:C.borderL,borderWidth:lslEligible?2:1.5}]}>
              <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <Text style={s.cardTitle}>⭐ Long Service Leave — {state}</Text>
                <View style={[s.badge,{backgroundColor:lslEligible?C.goldL:C.bg,borderColor:lslEligible?C.gold:C.border}]}>
                  <Text style={[s.badgeText,{color:lslEligible?C.gold:C.muted}]}>{lslEligible?'✅ Eligible':'⏳ Not yet'}</Text>
                </View>
              </View>
              <Text style={{fontSize:11,color:C.muted,fontWeight:'600',marginBottom:14,lineHeight:16}}>{lslRule.act}</Text>

              <View style={s.row}>
                {[
                  {icon:'⭐',label:'LSL Entitlement',value:lslEligible?`${lslHours}h`:'Not yet',sub:lslEligible?`${lslWeeks.toFixed(2)} weeks`:`Min ${lslRule.minYears} yrs`,color:C.gold,bg:C.goldL},
                  {icon:'📅',label:'Min Service',value:`${lslRule.minYears} yrs`,sub:'to be eligible',color:C.teal,bg:C.tealL},
                  {icon:'💰',label:'Est. LSL Pay',value:lslEligible&&rate>0?`A$${(lslPay/1000).toFixed(1)}k`:'—',sub:lslEligible&&rate>0?`A$${lslPay.toLocaleString('en-AU',{maximumFractionDigits:0})}`:'Enter rate',color:C.green,bg:C.greenL},
                ].map(stat=>(
                  <View key={stat.label} style={[s.statCard,{backgroundColor:stat.bg}]}>
                    <Text style={s.statIcon}>{stat.icon}</Text>
                    <Text style={[s.statValue,{color:stat.color,fontSize:14}]}>{stat.value}</Text>
                    <Text style={s.statLabel}>{stat.label}</Text>
                    <Text style={s.statSub}>{stat.sub}</Text>
                  </View>
                ))}
              </View>

              {!lslEligible&&years>0&&(
                <View style={{backgroundColor:C.bg,borderRadius:10,padding:12,marginTop:10,borderWidth:1,borderColor:C.borderL}}>
                  <Text style={{fontSize:12,color:C.muted,fontWeight:'700'}}>
                    ⏳ {(lslRule.minYears-years).toFixed(1)} more years until LSL eligibility in {state}
                  </Text>
                  <View style={{height:6,backgroundColor:C.borderL,borderRadius:3,marginTop:6,overflow:'hidden'}}>
                    <View style={{height:'100%',width:`${Math.min(100,(years/lslRule.minYears)*100)}%`,backgroundColor:C.gold,borderRadius:3}}/>
                  </View>
                </View>
              )}
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>📋 LSL Rules — All States</Text>
              {Object.entries(LSL_RULES).map(([st,r]:any,i,arr)=>(
                <View key={st} style={[s.ruleRow,{alignItems:'flex-start'},i<arr.length-1&&{borderBottomWidth:1,borderBottomColor:C.borderL}]}>
                  <View style={[s.stateBtnSmall,st===state&&{backgroundColor:C.navy}]}>
                    <Text style={[{fontSize:10,fontWeight:'800',color:C.muted},st===state&&{color:'#fff'}]}>{st}</Text>
                  </View>
                  <Text style={[s.ruleVal,{flex:1}]}>{r.note}</Text>
                </View>
              ))}
            </View>
          </>}

          {/* Fair Work general rules */}
          {activeTab==='annual'&&(
            <View style={s.card}>
              <Text style={s.cardTitle}>ℹ️ Annual Leave Rules</Text>
              {[
                ['Full-Time','4 weeks (152h/yr) accrued progressively'],
                ['Part-Time','4 weeks pro-rata on contracted hours'],
                ['Shift Worker','5 weeks (190h/yr) — 7-day roster'],
                ['Leave Loading','17.5% on base pay (check your award)'],
                ['Payout','Unused leave paid out on termination — s.90 FWA'],
              ].map(([k,v],i,arr)=>(
                <View key={k} style={[s.ruleRow,i<arr.length-1&&{borderBottomWidth:1,borderBottomColor:C.borderL}]}>
                  <Text style={s.ruleKey}>{k}</Text>
                  <Text style={s.ruleVal}>{v}</Text>
                </View>
              ))}
            </View>
          )}
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},
  content:{padding:14,paddingBottom:40},
  title:{fontSize:20,fontWeight:'900',color:C.navy,marginBottom:2},
  sub:{fontSize:11,color:C.muted,fontWeight:'600',marginBottom:16},
  card:{backgroundColor:C.white,borderRadius:16,padding:16,marginBottom:12,borderWidth:1.5,borderColor:C.borderL},
  cardTitle:{fontSize:14,fontWeight:'800',color:C.navy,marginBottom:12},
  typeGrid:{gap:8},
  typeBtn:{borderRadius:12,borderWidth:1.5,borderColor:C.border,backgroundColor:C.bg,padding:12},
  typeBtnLabel:{fontSize:13,fontWeight:'700',color:C.text,marginBottom:2},
  typeBtnSub:{fontSize:11,color:C.muted,fontWeight:'600'},
  label:{fontSize:10,color:C.muted,fontWeight:'700',textTransform:'uppercase',letterSpacing:0.5,marginBottom:4},
  input:{backgroundColor:C.bg,borderRadius:8,borderWidth:1.5,borderColor:C.border,padding:10,fontSize:13,color:C.text},
  row:{flexDirection:'row',gap:8,marginBottom:12},
  stateBtn:{borderRadius:20,borderWidth:1.5,borderColor:C.border,backgroundColor:C.bg,paddingHorizontal:12,paddingVertical:6},
  stateBtnText:{fontSize:12,color:C.muted,fontWeight:'700'},
  stateBtnSmall:{width:34,height:24,borderRadius:6,backgroundColor:C.bg,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center',marginRight:8,marginTop:2},
  tabRow:{flexDirection:'row',gap:6,marginBottom:12},
  tab:{flex:1,borderRadius:10,borderWidth:1.5,borderColor:C.border,backgroundColor:C.bg,padding:10,alignItems:'center'},
  tabText:{fontSize:11,color:C.muted,fontWeight:'700',textAlign:'center'},
  statCard:{flex:1,borderRadius:14,padding:10,alignItems:'center',borderWidth:1.5,borderColor:C.borderL},
  statIcon:{fontSize:18,marginBottom:2},
  statValue:{fontSize:15,fontWeight:'900',lineHeight:20},
  statLabel:{fontSize:9,color:C.muted,fontWeight:'700',textAlign:'center',marginTop:2},
  statSub:{fontSize:8,color:'#94A3B8',textAlign:'center',marginTop:1},
  loadingBox:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderRadius:12,padding:14,borderWidth:1.5},
  loadingDesc:{fontSize:12,fontWeight:'600',flex:1,paddingRight:10,lineHeight:17},
  loadingAmtLabel:{fontSize:9,color:C.muted,fontWeight:'700'},
  loadingAmt:{fontSize:18,fontWeight:'900'},
  ruleRow:{flexDirection:'row',paddingVertical:8,gap:8},
  ruleKey:{fontSize:11,fontWeight:'800',color:C.teal,width:90},
  ruleVal:{fontSize:11,color:C.muted,fontWeight:'600',flex:1,lineHeight:16},
  badge:{borderRadius:20,paddingHorizontal:10,paddingVertical:4,borderWidth:1.5},
  badgeText:{fontSize:11,fontWeight:'700'},
  orangeL:'#FFEDD5' as any,
});