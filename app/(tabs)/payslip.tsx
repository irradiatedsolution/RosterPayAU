import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { usePersonStore, useRosterStore } from '../../src/store';

const C = {
  bg:'#F0F4FF', white:'#FFFFFF', navy:'#1E3A5F',
  teal:'#0EA5A0', tealL:'#E0F7F6', tealB:'#9EDEDD',
  sky:'#EBF8FF', gold:'#F59E0B', goldL:'#FEF3C7',
  red:'#EF4444', redL:'#FEE2E2',
  green:'#10B981', greenL:'#D1FAE5',
  orange:'#F97316', subtle:'#94A3B8',
  text:'#1E293B', muted:'#64748B',
  border:'#CBD5E1', borderL:'#E2E8F0',
};

const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const FREQ_PERIODS: Record<string,number> = { weekly:52, fortnightly:26, '4-weekly':13, monthly:12 };

function fmt(n:number){ return Math.abs(n).toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function uid(){ return Math.random().toString(36).slice(2,9); }

function toISO(y:number,m:number,d:number){
  return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
}

function parseAUDate(s:string):string {
  if(!s) return '';
  if(s.includes('/')){
    const parts = s.split('/');
    const d=parts[0], m=parts[1], y=parts[2];
    if(d&&m&&y) return y+'-'+m.padStart(2,'0')+'-'+d.padStart(2,'0');
  }
  return s;
}

function calcTax(inc:number){
  if(inc<=18200) return 0;
  if(inc<=45000) return (inc-18200)*0.19;
  if(inc<=120000) return 5092+(inc-45000)*0.325;
  if(inc<=180000) return 29467+(inc-120000)*0.37;
  return 51667+(inc-180000)*0.45;
}
function calcLITO(inc:number){
  if(inc<=37500) return 700;
  if(inc<=45000) return 700-(inc-37500)*0.05;
  if(inc<=66667) return 325-(inc-45000)*0.015;
  return 0;
}
function calcMed(inc:number){
  if(inc<=26000) return 0;
  return inc*0.02;
}

function getPayPeriod(startISO:string, freq:string, offset:number):{start:string,end:string,label:string}{
  const today = new Date();
  today.setHours(0,0,0,0);

  if(freq==='monthly'){
    const base = new Date(today.getFullYear(), today.getMonth()+offset, 1);
    const y=base.getFullYear(), m=base.getMonth();
    const ps=new Date(y,m,1), pe=new Date(y,m+1,0);
    return {
      start: toISO(ps.getFullYear(),ps.getMonth(),ps.getDate()),
      end:   toISO(pe.getFullYear(),pe.getMonth(),pe.getDate()),
      label: MONTHS_S[m]+' '+y,
    };
  }

  const start = new Date(startISO+'T00:00:00');
  const days = freq==='weekly'?7:freq==='fortnightly'?14:28;
  const diffMs = today.getTime()-start.getTime();
  const diffDays = Math.floor(diffMs/86400000);
  const currentPeriodNum = Math.max(0,Math.floor(diffDays/days));
  const periodNum = currentPeriodNum + offset;

  const ps = new Date(start);
  ps.setDate(start.getDate()+periodNum*days);
  const pe = new Date(ps);
  pe.setDate(ps.getDate()+days-1);

  const fmtD = (d:Date) => d.getDate()+' '+MONTHS_S[d.getMonth()];
  return {
    start: toISO(ps.getFullYear(),ps.getMonth(),ps.getDate()),
    end:   toISO(pe.getFullYear(),pe.getMonth(),pe.getDate()),
    label: fmtD(ps)+' – '+fmtD(pe)+' '+pe.getFullYear(),
  };
}

function getDatesInPeriod(startISO:string, endISO:string):string[]{
  const dates:string[] = [];
  const cur = new Date(startISO+'T00:00:00');
  const end = new Date(endISO+'T00:00:00');
  while(cur<=end){
    dates.push(toISO(cur.getFullYear(),cur.getMonth(),cur.getDate()));
    cur.setDate(cur.getDate()+1);
  }
  return dates;
}

export default function PayslipScreen() {
  const person  = usePersonStore(s => s.getActivePerson());
  const entries = useRosterStore(s => s.entries);

  const [offset, setOffset]           = useState(0);
  const [manualRate, setManualRate]   = useState('');
  const [extraDeds, setExtraDeds]     = useState<{id:string;name:string;amount:string}[]>([]);

  if(!person) return (
    <View style={s.center}>
      <Text style={{fontSize:15,color:C.muted,textAlign:'center'}}>No profile found.{'\n'}Set up in Settings first.</Text>
    </View>
  );

  const freq    = person.payFreq || 'fortnightly';
  const periods = FREQ_PERIODS[freq] || 26;
  const rawStart= person.payPeriodStartDate || '';
  const isoStart= parseAUDate(rawStart) || toISO(new Date().getFullYear(), new Date().getMonth(), 1);

  const period      = getPayPeriod(isoStart, freq, offset);
  const periodDates = getDatesInPeriod(period.start, period.end);

  const periodEntries = periodDates
    .map(date => entries[person.id+'_'+date])
    .filter(e => e && !(e as any).off) as any[];

  const currentWage = person.wageHistory?.find((w:any) => w.to===null) || person.wageHistory?.[0];
  const settingsRate = currentWage ? currentWage.rate*(currentWage.casual?1.25:1) : 0;
  const hourlyRate  = parseFloat(manualRate) || settingsRate || 0;

  const totalHours = periodEntries.reduce((sum,e)=>sum+(e.netHours||0),0);
  const workDays   = periodEntries.length;

  const allowSummary: Record<string,{amount:number;taxable:boolean;color:string}> = {};
  periodEntries.forEach(e=>{
    (e.allowances||[]).forEach((a:any)=>{
      if(!allowSummary[a.name]) allowSummary[a.name]={amount:0,taxable:a.taxable,color:a.color||C.teal};
      allowSummary[a.name].amount += a.amount||0;
    });
  });

  const taxableAllow  = Object.values(allowSummary).filter(a=>a.taxable).reduce((s,a)=>s+a.amount,0);
  const nonTaxAllow   = Object.values(allowSummary).filter(a=>!a.taxable).reduce((s,a)=>s+a.amount,0);
  const totalAllow    = taxableAllow+nonTaxAllow;
  const basePay       = hourlyRate*totalHours;
  const grossPay      = basePay+totalAllow;
  const taxableInc    = basePay+taxableAllow;
  const annualInc     = taxableInc*periods;
  const annualTax     = Math.max(0,calcTax(annualInc)-calcLITO(annualInc));
  const annualMed     = calcMed(annualInc);
  const periodTax     = annualTax/periods;
  const periodMed     = annualMed/periods;
  const extraDedTotal = extraDeds.reduce((s,d)=>s+(parseFloat(d.amount)||0),0);
  const netPay        = grossPay-periodTax-periodMed-extraDedTotal;
  const superAmt      = basePay*0.115;
  const effRate       = annualInc>0?((annualTax+annualMed)/annualInc*100):0;

  async function sendPayslip(){
    const lines = [
      'PAYSLIP — '+period.label,
      '======================================',
      'Employer:  '+(person!.employer||'N/A'),
      'Employee:  '+(person!.name||'N/A'),
      'Position:  '+(person!.position||'N/A'),
      'Pay Freq:  '+freq,
      'Period:    '+period.label,
      '',
      'EARNINGS',
      '--------------------------------------',
      'Base Pay ('+totalHours.toFixed(1)+'h x A$'+hourlyRate.toFixed(2)+'):  A$'+fmt(basePay),
      ...Object.entries(allowSummary).map(([n,v])=>n+':  A$'+fmt(v.amount)+(v.taxable?'':' (non-tax)')),
      '',
      'GROSS PAY:   A$'+fmt(grossPay),
      '',
      'DEDUCTIONS (ATO FY2024-25)',
      '--------------------------------------',
      'Income Tax:  A$'+fmt(periodTax),
      'Medicare:    A$'+fmt(periodMed),
      ...extraDeds.filter(d=>parseFloat(d.amount)>0).map(d=>d.name+':  A$'+fmt(parseFloat(d.amount))),
      '',
      '======================================',
      'NET PAY:     A$'+fmt(netPay),
      '======================================',
      '',
      'Super (11.5%): A$'+fmt(superAmt),
      'Work Days: '+workDays,
      'Hours: '+totalHours.toFixed(1)+'h',
      'Eff. Tax Rate: '+effRate.toFixed(1)+'%',
      '',
      '* ATO FY2024-25 + LITO. Indicative only.',
    ];
    await Share.share({message:lines.join('\n')});
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>

        <Text style={s.title}>💰 Payslip</Text>
        <Text style={s.sub}>{person.name} · ATO FY2024-25</Text>

        {/* Pay Period selector */}
        <View style={s.card}>
          <Text style={s.cardTitle}>📅 Pay Period</Text>
          <View style={s.periodNav}>
            <TouchableOpacity onPress={()=>setOffset(o=>o-1)} style={s.periodNavBtn}>
              <Text style={s.periodNavArrow}>‹</Text>
            </TouchableOpacity>
            <View style={{flex:1,alignItems:'center'}}>
              <Text style={s.periodLabel}>{period.label}</Text>
              <Text style={s.periodSub}>{freq} · {workDays} shifts · {totalHours.toFixed(1)}h</Text>
            </View>
            <TouchableOpacity
              onPress={()=>setOffset(o=>Math.min(0,o+1))}
              style={[s.periodNavBtn,offset>=0&&{opacity:0.3}]}>
              <Text style={s.periodNavArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {!rawStart&&(
            <View style={s.warningBox}>
              <Text style={s.warningTxt}>⚠️ Set your Pay Period Start Date in Settings for accurate periods.</Text>
            </View>
          )}

          {periodEntries.length>0?(
            <View style={s.rosterSummary}>
              <Text style={[s.lbl,{marginBottom:8}]}>Shifts from Roster</Text>
              {periodEntries.slice(0,5).map((e:any,i:number)=>(
                <View key={i} style={s.rosterRow}>
                  <Text style={s.rosterDate}>{e.date}</Text>
                  <Text style={s.rosterTime}>{e.start}–{e.end}</Text>
                  <Text style={s.rosterHours}>{e.netHours}h</Text>
                  {(e.penaltyMultiplier||1)>1&&(
                    <Text style={[s.rosterPenalty,{color:e.penaltyColor||C.orange}]}>×{e.penaltyMultiplier}</Text>
                  )}
                </View>
              ))}
              {periodEntries.length>5&&(
                <Text style={{fontSize:11,color:C.muted,textAlign:'center',marginTop:4}}>
                  +{periodEntries.length-5} more shifts
                </Text>
              )}
            </View>
          ):(
            <View style={s.emptyRoster}>
              <Text style={s.emptyRosterTxt}>No shifts in Roster for this period.</Text>
              <Text style={s.emptyRosterSub}>Add shifts in the Roster tab to auto-calculate.</Text>
            </View>
          )}
        </View>

        {/* Hourly rate */}
        <View style={s.card}>
          <Text style={s.cardTitle}>💵 Hourly Rate</Text>
          {settingsRate>0&&(
            <View style={s.rateBox}>
              <View style={{flex:1}}>
                <Text style={s.rateValue}>A${settingsRate.toFixed(2)}/hr</Text>
                <Text style={s.rateSub}>From Settings{currentWage?.casual?' (incl. 25% casual loading)':''}</Text>
              </View>
            </View>
          )}
          <View style={{marginTop:8}}>
            <Text style={s.lbl}>Override rate (optional)</Text>
            <TextInput style={s.inp} value={manualRate} onChangeText={setManualRate}
              placeholder={settingsRate>0?'A$'+settingsRate.toFixed(2)+' (from Settings)':'Enter hourly rate'}
              keyboardType="decimal-pad"/>
          </View>
          <Text style={[s.lbl,{marginTop:8}]}>
            Using: <Text style={{color:C.teal,fontWeight:'800'}}>A${hourlyRate.toFixed(2)}/hr</Text>
            {' · '}Base pay: <Text style={{color:C.navy,fontWeight:'800'}}>A${fmt(basePay)}</Text>
          </Text>
        </View>

        {/* Allowances from roster */}
        {Object.keys(allowSummary).length>0&&(
          <View style={s.card}>
            <Text style={s.cardTitle}>➕ Allowances from Roster</Text>
            {Object.entries(allowSummary).map(([name,v])=>(
              <View key={name} style={s.allowRow}>
                <View style={[s.allowDot,{backgroundColor:v.color}]}/>
                <Text style={s.allowName}>{name}</Text>
                <View style={[s.taxBadge,{backgroundColor:v.taxable?C.redL:C.greenL}]}>
                  <Text style={[s.taxBadgeTxt,{color:v.taxable?C.red:C.green}]}>{v.taxable?'Tax':'Non-Tax'}</Text>
                </View>
                <Text style={s.allowAmt}>A${fmt(v.amount)}</Text>
              </View>
            ))}
            <View style={s.allowTotal}>
              <Text style={s.allowTotalLbl}>Total Allowances</Text>
              <Text style={s.allowTotalAmt}>A${fmt(totalAllow)}</Text>
            </View>
          </View>
        )}

        {/* Extra deductions */}
        <View style={s.card}>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <Text style={s.cardTitle}>➖ Extra Deductions</Text>
            <TouchableOpacity onPress={()=>setExtraDeds(d=>[...d,{id:uid(),name:'',amount:''}])} style={s.addBtn}>
              <Text style={s.addBtnTxt}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {extraDeds.length===0?(
            <Text style={{fontSize:12,color:C.muted}}>e.g. Salary Sacrifice, Union Fees</Text>
          ):(
            extraDeds.map((d,i)=>(
              <View key={d.id} style={{flexDirection:'row',gap:8,marginBottom:8,alignItems:'center'}}>
                <TextInput style={[s.inp,{flex:1}]} value={d.name}
                  onChangeText={v=>{const a=[...extraDeds];a[i].name=v;setExtraDeds(a);}}
                  placeholder="Deduction name"/>
                <TextInput style={[s.inp,{width:100}]} value={d.amount}
                  onChangeText={v=>{const a=[...extraDeds];a[i].amount=v;setExtraDeds(a);}}
                  placeholder="0.00" keyboardType="decimal-pad"/>
                <TouchableOpacity onPress={()=>setExtraDeds(extraDeds.filter((_,j)=>j!==i))}>
                  <Text style={{color:C.red,fontSize:18}}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* ATO Summary */}
        <View style={[s.card,{borderColor:C.teal,borderWidth:2}]}>
          <Text style={[s.cardTitle,{color:C.teal}]}>🧾 ATO Tax Summary — FY2024-25</Text>

          <View style={s.overviewGrid}>
            {[
              {l:'Est. Annual Income', v:'A$'+fmt(annualInc), bg:C.sky,    c:C.navy},
              {l:'Effective Tax Rate', v:effRate.toFixed(1)+'%', bg:C.goldL, c:C.gold},
              {l:'Annual Income Tax',  v:'A$'+fmt(annualTax), bg:C.redL,   c:C.red},
              {l:'Annual Medicare',    v:'A$'+fmt(annualMed), bg:C.redL,   c:C.red},
            ].map(r=>(
              <View key={r.l} style={[s.overviewCard,{backgroundColor:r.bg}]}>
                <Text style={s.overviewLbl}>{r.l}</Text>
                <Text style={[s.overviewVal,{color:r.c}]}>{r.v}</Text>
              </View>
            ))}
          </View>

          <View style={s.breakdown}>
            {([
              {l:'Base Pay ('+totalHours.toFixed(1)+'h × $'+hourlyRate.toFixed(2)+')', v:basePay,       c:C.text},
              {l:'Taxable Allowances',    v:taxableAllow,  c:'#4F46E5'},
              {l:'Non-Taxable Allow.',    v:nonTaxAllow,   c:C.green},
              {l:'GROSS PAY',             v:grossPay,      c:C.navy,  bold:true, sep:true},
              {l:'Income Tax Withheld',   v:-periodTax,    c:C.red},
              {l:'Medicare Levy (2%)',    v:-periodMed,    c:C.red},
              {l:'Other Deductions',      v:-extraDedTotal,c:C.gold},
              {l:'NET PAY',               v:netPay,        c:C.teal,  bold:true, big:true, sep:true},
            ] as any[]).map((r,i)=>(
              <View key={i} style={[s.breakRow,r.sep&&{borderTopWidth:1.5,borderTopColor:C.border,paddingTop:8,marginTop:4}]}>
                <Text style={[s.breakLbl,r.bold&&{fontWeight:'800',color:C.navy}]}>{r.l}</Text>
                <Text style={[s.breakVal,{color:r.c},r.big&&{fontSize:22,fontWeight:'900'}]}>
                  {r.v<0?'−':''}A${fmt(Math.abs(r.v))}
                </Text>
              </View>
            ))}
            <View style={[s.breakRow,{borderTopWidth:1,borderTopColor:C.borderL,marginTop:6,paddingTop:8}]}>
              <Text style={s.breakLbl}>Super (11.5% SG — employer pays)</Text>
              <Text style={[s.breakVal,{color:C.gold,fontWeight:'800'}]}>A${fmt(superAmt)}</Text>
            </View>
          </View>
        </View>

        <Text style={s.disclaimer}>⚠️ ATO FY2024-25 resident brackets + LITO. Medicare 2%. Super 11.5%. Indicative estimate only.</Text>

        <TouchableOpacity onPress={sendPayslip} style={s.emailBtn}>
          <Text style={s.emailBtnTxt}>📧 Share Payslip</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},
  content:{padding:14,paddingBottom:40},
  center:{flex:1,alignItems:'center',justifyContent:'center',padding:20},
  title:{fontSize:20,fontWeight:'900',color:C.navy},
  sub:{fontSize:11,color:C.muted,fontWeight:'600',marginBottom:16},
  card:{backgroundColor:C.white,borderRadius:16,padding:16,marginBottom:12,borderWidth:1.5,borderColor:C.borderL},
  cardTitle:{fontSize:14,fontWeight:'800',color:C.navy,marginBottom:12},
  periodNav:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:C.bg,borderRadius:12,padding:10},
  periodNavBtn:{width:36,height:36,borderRadius:10,backgroundColor:C.white,borderWidth:1.5,borderColor:C.border,alignItems:'center',justifyContent:'center'},
  periodNavArrow:{fontSize:20,color:C.navy,fontWeight:'800'},
  periodLabel:{fontSize:14,fontWeight:'800',color:C.navy,textAlign:'center'},
  periodSub:{fontSize:11,color:C.muted,fontWeight:'600',marginTop:2,textAlign:'center'},
  warningBox:{backgroundColor:C.goldL,borderRadius:10,padding:10,marginTop:10,borderWidth:1,borderColor:C.gold+'66'},
  warningTxt:{fontSize:12,color:'#92400E',fontWeight:'600'},
  rosterSummary:{backgroundColor:C.bg,borderRadius:10,padding:12,marginTop:10,borderWidth:1,borderColor:C.borderL},
  rosterRow:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:4,borderBottomWidth:1,borderBottomColor:C.borderL},
  rosterDate:{fontSize:11,color:C.muted,fontWeight:'600',width:85},
  rosterTime:{fontSize:11,color:C.teal,fontWeight:'700',flex:1},
  rosterHours:{fontSize:11,fontWeight:'800',color:C.navy,width:35},
  rosterPenalty:{fontSize:10,fontWeight:'800',width:28},
  emptyRoster:{backgroundColor:C.bg,borderRadius:10,padding:16,marginTop:10,alignItems:'center',borderWidth:1,borderColor:C.borderL,borderStyle:'dashed'},
  emptyRosterTxt:{fontSize:13,color:C.muted,fontWeight:'700',textAlign:'center'},
  emptyRosterSub:{fontSize:11,color:C.subtle,fontWeight:'600',textAlign:'center',marginTop:4},
  rateBox:{flexDirection:'row',alignItems:'center',backgroundColor:C.tealL,borderRadius:10,padding:12,borderWidth:1.5,borderColor:C.tealB},
  rateValue:{fontSize:18,fontWeight:'900',color:C.teal},
  rateSub:{fontSize:11,color:C.muted,fontWeight:'600',marginTop:2},
  lbl:{fontSize:10,color:C.muted,fontWeight:'700',marginBottom:4},
  inp:{backgroundColor:C.bg,borderRadius:8,borderWidth:1.5,borderColor:C.border,padding:10,fontSize:13,color:C.text},
  addBtn:{backgroundColor:C.tealL,borderRadius:8,borderWidth:1.5,borderColor:C.tealB,paddingHorizontal:12,paddingVertical:6},
  addBtnTxt:{color:C.teal,fontWeight:'800',fontSize:12},
  allowRow:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:6,borderBottomWidth:1,borderBottomColor:C.borderL},
  allowDot:{width:8,height:8,borderRadius:2},
  allowName:{flex:1,fontSize:13,color:C.text,fontWeight:'600'},
  allowAmt:{fontSize:13,fontWeight:'800',color:C.navy},
  allowTotal:{flexDirection:'row',justifyContent:'space-between',paddingTop:8,marginTop:4},
  allowTotalLbl:{fontSize:13,fontWeight:'800',color:C.navy},
  allowTotalAmt:{fontSize:15,fontWeight:'900',color:C.navy},
  taxBadge:{borderRadius:20,paddingHorizontal:7,paddingVertical:2},
  taxBadgeTxt:{fontSize:9,fontWeight:'700'},
  overviewGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:14},
  overviewCard:{width:'47%',borderRadius:10,padding:12,borderWidth:1.5,borderColor:C.borderL},
  overviewLbl:{fontSize:10,color:C.muted,fontWeight:'700',marginBottom:3},
  overviewVal:{fontSize:15,fontWeight:'900'},
  breakdown:{backgroundColor:C.bg,borderRadius:12,padding:14},
  breakRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:5},
  breakLbl:{fontSize:12,color:C.muted,fontWeight:'600',flex:1},
  breakVal:{fontSize:13,fontWeight:'600'},
  disclaimer:{fontSize:10,color:C.muted,fontWeight:'600',lineHeight:16,marginBottom:12},
  emailBtn:{backgroundColor:C.teal,borderRadius:13,padding:15,alignItems:'center'},
  emailBtnTxt:{color:'#fff',fontWeight:'900',fontSize:15},
});