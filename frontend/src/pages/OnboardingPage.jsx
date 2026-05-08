import { useState } from 'react';
import { supabase } from '../supabase';

const MAJORS = [
  '컴퓨터공학', '정보보안', '소프트웨어학', '전기전자공학', '기계공학',
  '화학공학', '경영학', '경제학', '심리학', '사회학',
  '디자인', '미디어커뮤니케이션', '간호학',
];

// 학과 계열 색상
const CATEGORY_COLOR = {
  '공학계열': '#3b82f6',
  '자연계열': '#10b981',
  '사회계열': '#f59e0b',
  '인문계열': '#8b5cf6',
  '교육계열': '#ec4899',
  '예체능계열': '#f97316',
  '의약계열': '#ef4444',
};

export default function OnboardingPage({ session, onComplete }) {
  const [step, setStep] = useState(1); // 1:기본정보, 2:PDF업로드, 3:학과선택
  const [currentMajor, setCurrentMajor] = useState('');
  const [customMajor, setCustomMajor] = useState('');
  const [grade, setGrade] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // PDF 관련
  const [pdfFile, setPdfFile] = useState(null);
  const [examType, setExamType] = useState('L');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfResult, setPdfResult] = useState(null);
  const [pdfError, setPdfError] = useState('');

  // 학과 추천 관련
  const [recommendedMajors, setRecommendedMajors] = useState([]);
  const [majorLoading, setMajorLoading] = useState(false);
  const [selectedMajor, setSelectedMajor] = useState(null);
  const [customMajorInput, setCustomMajorInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const finalCurrentMajor = currentMajor === '기타직접입력' ? customMajor : currentMajor;

  // Step 1: 기본정보 저장
  const handleSaveProfile = async () => {
    if (!finalCurrentMajor || !grade) { setError('모든 항목을 선택해주세요'); return; }
    setLoading(true); setError('');
    const { error: e } = await supabase.from('profiles').upsert(
      { user_id: session.user.id, current_major: finalCurrentMajor, grade: parseInt(grade) },
      { onConflict: 'user_id' }
    );
    if (e) setError(e.message);
    else setStep(2);
    setLoading(false);
  };

  // Step 2: PDF 업로드 → 파싱 → 학과 추천
  const handlePdfUpload = async () => {
    if (!pdfFile) { setPdfError('PDF 파일을 선택해주세요'); return; }
    setPdfLoading(true); setPdfError('');
    try {
      const base64 = await fileToBase64(pdfFile);
      // PDF 파싱
      const parseRes = await fetch('/.netlify/functions/parse-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData: base64, examType }),
      });
      const parsed = await parseRes.json();
      if (parsed.error) throw new Error(parsed.error);
      setPdfResult(parsed);

      // 학과 추천
      setMajorLoading(true);
      const majRes = await fetch('/.netlify/functions/recommend-majors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hollandCode: parsed.hollandCode,
          interestScores: parsed.rawScores || {},
          currentMajor: finalCurrentMajor,
          grade,
        }),
      });
      const majData = await majRes.json();
      if (majData.majors) setRecommendedMajors(majData.majors);
    } catch (err) {
      setPdfError('오류: ' + err.message);
    }
    setPdfLoading(false);
    setMajorLoading(false);
  };

  const fileToBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.readAsDataURL(file);
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = rej;
  });

  // Step 3: 학과 선택 후 완료
  const handleComplete = async () => {
    const finalTargetName = showCustomInput ? customMajorInput : selectedMajor?.name;
    const finalTargetSeq = showCustomInput ? null : selectedMajor?.seq;
    if (!finalTargetName) return;
    setLoading(true);
    await supabase.from('profiles').upsert(
      {
        user_id: session.user.id,
        current_major: finalCurrentMajor,
        target_major: finalTargetName,
        target_major_seq: finalTargetSeq,
        grade: parseInt(grade),
      },
      { onConflict: 'user_id' }
    );
    onComplete(
      { current_major: finalCurrentMajor, target_major: finalTargetName, target_major_seq: finalTargetSeq, grade: parseInt(grade) },
      pdfResult
    );
    setLoading(false);
  };

  const handleLogout = () => supabase.auth.signOut();

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7ff', fontFamily: "'Pretendard', sans-serif" }}>
      {/* 헤더 */}
      <div style={{ background: '#fff', borderBottom: '1px solid #ede9fe', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>환</span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1e1b4b' }}>환승전공 안내서</div>
            <div style={{ fontSize: 11, color: '#7c3aed' }}>나에게 맞는 전공을 찾아드려요</div>
          </div>
        </div>
        <button onClick={handleLogout} style={{ fontSize: 12, padding: '6px 12px', border: '1px solid #ede9fe', borderRadius: 6, cursor: 'pointer', background: '#fff', color: '#7c3aed' }}>
          로그아웃
        </button>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px' }}>
        {/* 진행 바 */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {['기본 정보', 'PDF 분석', '학과 선택'].map((label, i) => (
              <div key={i} style={{ flex: 1 }}>
                <div style={{
                  height: 4, borderRadius: 2, marginBottom: 6,
                  background: step > i + 1 ? '#7c3aed' : step === i + 1 ? 'linear-gradient(90deg, #7c3aed, #4f46e5)' : '#ede9fe',
                  transition: 'all 0.3s',
                }} />
                <div style={{ fontSize: 11, color: step === i + 1 ? '#7c3aed' : '#a78bfa', textAlign: 'center', fontWeight: step === i + 1 ? 600 : 400 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* STEP 1: 기본 정보 */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e1b4b', margin: '0 0 6px' }}>현재 전공을 알려주세요</h2>
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>정확한 갭 분석을 위해 필요해요</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {MAJORS.map(m => (
                <button key={m} onClick={() => { setCurrentMajor(m); setCustomMajor(''); }}
                  style={{
                    padding: '12px 8px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
                    border: currentMajor === m ? '2px solid #7c3aed' : '1.5px solid #ede9fe',
                    background: currentMajor === m ? '#f5f3ff' : '#fff',
                    color: currentMajor === m ? '#7c3aed' : '#374151',
                    fontWeight: currentMajor === m ? 600 : 400,
                    transition: 'all 0.15s',
                  }}>
                  {m}
                </button>
              ))}
              <button onClick={() => { setCurrentMajor('기타직접입력'); }}
                style={{
                  padding: '12px 8px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
                  border: currentMajor === '기타직접입력' ? '2px solid #7c3aed' : '1.5px dashed #d1d5db',
                  background: currentMajor === '기타직접입력' ? '#f5f3ff' : '#fafafa',
                  color: currentMajor === '기타직접입력' ? '#7c3aed' : '#9ca3af',
                }}>
                직접 입력
              </button>
            </div>

            {currentMajor === '기타직접입력' && (
              <input type="text" placeholder="전공명 입력 (예: 항공우주공학)" value={customMajor}
                onChange={e => setCustomMajor(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, marginBottom: 16, border: '1.5px solid #7c3aed', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            )}

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1e1b4b', marginBottom: 10 }}>현재 학년</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {['1', '2', '3', '4'].map(g => (
                  <button key={g} onClick={() => setGrade(g)}
                    style={{
                      padding: '14px 8px', borderRadius: 10, fontSize: 15, cursor: 'pointer',
                      border: grade === g ? '2px solid #7c3aed' : '1.5px solid #ede9fe',
                      background: grade === g ? '#7c3aed' : '#fff',
                      color: grade === g ? '#fff' : '#374151',
                      fontWeight: grade === g ? 700 : 400,
                      transition: 'all 0.15s',
                    }}>
                    {g}학년
                  </button>
                ))}
              </div>
            </div>

            {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}

            <button onClick={handleSaveProfile}
              disabled={!finalCurrentMajor || !grade || loading}
              style={{
                width: '100%', padding: 16, borderRadius: 12, fontSize: 15, fontWeight: 600,
                background: finalCurrentMajor && grade ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : '#e5e7eb',
                color: finalCurrentMajor && grade ? '#fff' : '#9ca3af',
                border: 'none', cursor: finalCurrentMajor && grade ? 'pointer' : 'default',
                boxShadow: finalCurrentMajor && grade ? '0 4px 14px rgba(124,58,237,0.3)' : 'none',
              }}>
              {loading ? '저장 중...' : '다음 단계 →'}
            </button>
          </div>
        )}

        {/* STEP 2: PDF 업로드 */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e1b4b', margin: '0 0 6px' }}>워크넷 검사 결과를 올려주세요</h2>
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>AI가 흥미유형을 분석해 딱 맞는 학과를 추천해드려요</p>
            </div>

            {/* 검사 유형 선택 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[['L', 'L형 (정밀)', '흥미+성격+생활사'], ['S', 'S형 (간단)', '흥미만']].map(([t, label, desc]) => (
                <button key={t} onClick={() => setExamType(t)}
                  style={{
                    flex: 1, padding: 14, borderRadius: 10, cursor: 'pointer',
                    border: examType === t ? '2px solid #7c3aed' : '1.5px solid #ede9fe',
                    background: examType === t ? '#f5f3ff' : '#fff',
                  }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: examType === t ? '#7c3aed' : '#374151' }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{desc}</div>
                </button>
              ))}
            </div>

            {/* 파일 선택 */}
            <div onClick={() => document.getElementById('pdf-input').click()}
              style={{
                border: `2px dashed ${pdfFile ? '#7c3aed' : '#d1d5db'}`,
                borderRadius: 16, padding: 40, textAlign: 'center',
                background: pdfFile ? '#f5f3ff' : '#fafafa', cursor: 'pointer', marginBottom: 16,
              }}>
              <input id="pdf-input" type="file" accept=".pdf" style={{ display: 'none' }}
                onChange={e => setPdfFile(e.target.files[0])} />
              {pdfFile ? (
                <>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#7c3aed', margin: 0 }}>{pdfFile.name}</p>
                  <p style={{ fontSize: 12, color: '#a78bfa', margin: '4px 0 0' }}>클릭하면 변경</p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>📊</div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>PDF 파일 선택</p>
                  <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>워크넷 직업선호도검사 결과지</p>
                </>
              )}
            </div>

            {pdfError && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{pdfError}</p>}

            {/* 분석 결과 표시 */}
            {pdfResult && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: '#166534', margin: 0 }}>
                  분석 완료! 홀랜드 코드: <strong style={{ fontSize: 16 }}>{pdfResult.hollandCode}</strong>
                  {pdfResult.rawScores && (
                    <span style={{ marginLeft: 8, fontSize: 12, color: '#4ade80' }}>
                      (R:{pdfResult.rawScores.R} I:{pdfResult.rawScores.I} A:{pdfResult.rawScores.A} S:{pdfResult.rawScores.S} E:{pdfResult.rawScores.E} C:{pdfResult.rawScores.C})
                    </span>
                  )}
                </p>
              </div>
            )}

            {majorLoading && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 16, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#1d4ed8' }}>커리어넷 데이터로 학과를 분석하는 중...</div>
                <div style={{ fontSize: 12, color: '#93c5fd', marginTop: 4 }}>잠시만 기다려주세요 (약 10~15초)</div>
              </div>
            )}

            {recommendedMajors.length > 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: '#166534', margin: 0 }}>
                  {recommendedMajors.length}개 학과 추천 완료! 아래에서 선택해주세요
                </p>
              </div>
            )}

            <button
              onClick={recommendedMajors.length > 0 ? () => setStep(3) : handlePdfUpload}
              disabled={pdfLoading || majorLoading || (!pdfFile && recommendedMajors.length === 0)}
              style={{
                width: '100%', padding: 16, borderRadius: 12, fontSize: 15, fontWeight: 600,
                background: pdfFile || recommendedMajors.length > 0
                  ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : '#e5e7eb',
                color: pdfFile || recommendedMajors.length > 0 ? '#fff' : '#9ca3af',
                border: 'none', cursor: 'pointer', marginBottom: 8,
                boxShadow: pdfFile ? '0 4px 14px rgba(124,58,237,0.3)' : 'none',
              }}>
              {pdfLoading || majorLoading ? '분석 중...' :
                recommendedMajors.length > 0 ? '학과 선택하러 가기 →' : '검사 결과 분석하기'}
            </button>

            <button onClick={() => setStep(1)}
              style={{ width: '100%', padding: 12, borderRadius: 10, fontSize: 13, border: '1.5px solid #ede9fe', background: '#fff', cursor: 'pointer', color: '#6b7280' }}>
              ← 이전
            </button>
          </div>
        )}

        {/* STEP 3: 학과 선택 */}
        {step === 3 && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e1b4b', margin: '0 0 6px' }}>
                홀랜드 코드 <span style={{ color: '#7c3aed' }}>{pdfResult?.hollandCode}</span> 맞춤 학과예요
              </h2>
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>관심 있는 학과를 선택하면 갭 분석을 시작해요</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {recommendedMajors.map((maj, i) => (
                <div key={i} onClick={() => { setSelectedMajor(maj); setShowCustomInput(false); }}
                  style={{
                    border: selectedMajor?.seq === maj.seq ? '2px solid #7c3aed' : '1.5px solid #ede9fe',
                    borderRadius: 14, padding: 18, cursor: 'pointer',
                    background: selectedMajor?.seq === maj.seq ? '#f5f3ff' : '#fff',
                    transition: 'all 0.15s',
                    boxShadow: selectedMajor?.seq === maj.seq ? '0 4px 16px rgba(124,58,237,0.15)' : 'none',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <span style={{
                        display: 'inline-block', fontSize: 11, padding: '2px 8px', borderRadius: 99,
                        background: `${CATEGORY_COLOR[maj.category] || '#6366f1'}20`,
                        color: CATEGORY_COLOR[maj.category] || '#6366f1',
                        marginBottom: 4,
                      }}>{maj.category}</span>
                      <div style={{ fontSize: 17, fontWeight: 700, color: '#1e1b4b' }}>{maj.name}</div>
                      <div style={{ fontSize: 12, color: '#7c3aed', marginTop: 2 }}>{maj.keyword}</div>
                    </div>
                    <div style={{
                      background: maj.match >= 80 ? '#dcfce7' : maj.match >= 60 ? '#fef3c7' : '#fee2e2',
                      color: maj.match >= 80 ? '#166534' : maj.match >= 60 ? '#92400e' : '#991b1b',
                      fontSize: 14, fontWeight: 700, padding: '6px 12px', borderRadius: 99,
                    }}>
                      {maj.match}%
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: '#4b5563', margin: '0 0 8px', lineHeight: 1.5 }}>{maj.reason}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {maj.employment && (
                      <span style={{ fontSize: 11, color: '#059669', background: '#f0fdf4', padding: '2px 8px', borderRadius: 99 }}>
                        취업률 {maj.employment}
                      </span>
                    )}
                    {maj.salary && (
                      <span style={{ fontSize: 11, color: '#d97706', background: '#fffbeb', padding: '2px 8px', borderRadius: 99 }}>
                        초봉 {maj.salary}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: 99 }}>
                      {maj.jobs}
                    </span>
                  </div>
                </div>
              ))}

              {/* 직접 입력 */}
              <div onClick={() => { setShowCustomInput(true); setSelectedMajor(null); }}
                style={{
                  border: showCustomInput ? '2px solid #7c3aed' : '2px dashed #d1d5db',
                  borderRadius: 14, padding: 16, cursor: 'pointer',
                  background: showCustomInput ? '#f5f3ff' : '#fafafa', textAlign: 'center',
                }}>
                <p style={{ fontSize: 14, color: showCustomInput ? '#7c3aed' : '#9ca3af', margin: 0 }}>
                  원하는 학과가 없어요 — 직접 입력할게요
                </p>
              </div>
            </div>

            {showCustomInput && (
              <input type="text" placeholder="학과명 직접 입력 (예: 도시공학과, 철학과)" value={customMajorInput}
                onChange={e => setCustomMajorInput(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, marginBottom: 12, border: '1.5px solid #7c3aed', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            )}

            <button onClick={handleComplete}
              disabled={(!selectedMajor && !customMajorInput) || loading}
              style={{
                width: '100%', padding: 16, borderRadius: 12, fontSize: 15, fontWeight: 600,
                background: selectedMajor || customMajorInput ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : '#e5e7eb',
                color: selectedMajor || customMajorInput ? '#fff' : '#9ca3af',
                border: 'none', cursor: selectedMajor || customMajorInput ? 'pointer' : 'default', marginBottom: 8,
                boxShadow: selectedMajor || customMajorInput ? '0 4px 14px rgba(124,58,237,0.3)' : 'none',
              }}>
              {loading ? '분석 시작 중...' : '이 학과로 갭 분석 시작 →'}
            </button>

            <button onClick={() => setStep(2)}
              style={{ width: '100%', padding: 12, borderRadius: 10, fontSize: 13, border: '1.5px solid #ede9fe', background: '#fff', cursor: 'pointer', color: '#6b7280' }}>
              ← 이전
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
