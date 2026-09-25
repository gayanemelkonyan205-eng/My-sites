const zone='Asia/Yerevan';
const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'});

export function schoolDate(offset=0,from=new Date()){
  const map=Object.fromEntries(parts.formatToParts(from).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
  const date=new Date(Date.UTC(Number(map.year),Number(map.month)-1,Number(map.day)+offset,12));
  return date.toISOString().slice(0,10);
}

export function schoolWeekday(date){return new Date(`${date}T12:00:00Z`).getUTCDay()||7;}

export function effectiveLessons(regular,changes,date){
  const byNumber=new Map(regular.filter(row=>row.weekday===schoolWeekday(date)).map(row=>[row.lesson_number,{...row}]));
  for(const change of changes.filter(row=>row.class_date===date)){
    const original=byNumber.get(change.lesson_number);
    if(change.kind==='CANCELLED'){
      byNumber.set(change.lesson_number,{...original,...change,cancelled:true,changed:true});
    }else if(change.kind==='ADDED'||original){
      byNumber.set(change.lesson_number,{
        ...original,...change,
        subject:change.subject||original?.subject,
        subject_id:change.subject_id||original?.subject_id,
        start_time:change.start_time||original?.start_time,
        end_time:change.end_time||original?.end_time,
        room:change.room===null?original?.room:change.room,
        changed:true
      });
    }
  }
  return [...byNumber.values()].filter(row=>row.lesson_number).sort((a,b)=>a.lesson_number-b.lesson_number);
}
