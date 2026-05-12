import { useState } from 'react';
import { supabase } from '../supabase';
import { logo } from '../assets';

const MAJORS = [
  '컴퓨터공학',
  '정보보안',
  '소프트웨어학',
  '전기전자공학',
  '기계공학',
  '화학공학',
  '경영학',
  '경제학',
  '심리학',
  '사회학',
  '디자인',
  '미디어커뮤니케이션',
  '간호학',
];

// ── 카테고리 매핑 — 잉크 톤으로 통일(파스텔 액센트만 사용) ──
const CATEGORY_COLOR = {
  공학계열: '#a8c8e8',
  자연계열: '#a7e5d3',
  사회계열: '#f4c5a8',
  인문계열: '#c8b8e0',
  교육계열: '#e8b8c4',
  예체능계열: '#f4c5a8',
  의약계열: '#e8b8c4',
};

// ── ElevenLabs 에디토리얼 디자인 토큰 ──
const C = {
  canvas: '#f5f5f5',
  canvasSoft: '#fafafa',
  surface: '#ffffff',
  surfaceStrong: '#f0efed',
  surfaceDark: '#0c0a09',
  ink: '#0c0a09',
  primary: '#292524',
  body: '#4e4e4e',
  muted: '#777169',
  mutedSoft: '#a8a29e',
  hairline: '#e7e5e4',
  hairlineSoft: '#f0efed',
  hairlineStrong: '#d6d3d1',
  onPrimary: '#ffffff',
  onDark: '#ffffff',
  onDarkSoft: '#a8a29e',
  gMint: '#a7e5d3',
  gPeach: '#f4c5a8',
  gLavender: '#c8b8e0',
  gSky: '#a8c8e8',
  gRose: '#e8b8c4',
  success: '#16a34a',
  error: '#dc2626',
};

export default function OnboardingPage({ session, onComplete }) {
  const [step, setStep] = useState(1);
  const [currentMajor, setCurrentMajor] = useState('');
  const [customMajor, setCustomMajor] = useState('');
  const [grade, setGrade] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [pdfFile, setPdfFile] = useState(null);
  const [examType, setExamType] = useState('L');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfResult, setPdfResult] = useState(null);
  const [pdfError, setPdfError] = useState('');

  const [recommendedMajors, setRecommendedMajors] = useState([]);
  const [majorLoading, setMajorLoading] = useState(false);
  const [selectedMajor, setSelectedMajor] = useState(null);
  const [customMajorInput, setCustomMajorInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const finalCurrentMajor =
    currentMajor === '기타직접입력' ? customMajor : currentMajor;

  // ── 로직 원본 유지 ──
  const handleSaveProfile = async () => {
    if (!finalCurrentMajor || !grade) {
      setError('모든 항목을 선택해주세요');
      return;
    }
    setLoading(true);
    setError('');
    const { error: e } = await supabase.from('profiles').upsert(
      {
        user_id: session.user.id,
        current_major: finalCurrentMajor,
        grade: parseInt(grade),
      },
      { onConflict: 'user_id' },
    );
    if (e) setError(e.message);
    else setStep(2);
    setLoading(false);
  };

  const handlePdfUpload = async () => {
    if (!pdfFile) {
      setPdfError('PDF 파일을 선택해주세요');
      return;
    }
    setPdfLoading(true);
    setPdfError('');
    try {
      const base64 = await fileToBase64(pdfFile);
      const parseRes = await fetch('/.netlify/functions/parse-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileData: base64, examType }),
      });
      const parsed = await parseRes.json();
      if (parsed.error) throw new Error(parsed.error);
      setPdfResult(parsed);
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

  const fileToBase64 = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.readAsDataURL(file);
      r.onload = () => res(r.result.split(',')[1]);
      r.onerror = rej;
    });

  const handleComplete = async () => {
    const finalTargetName = showCustomInput
      ? customMajorInput
      : selectedMajor?.name;
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
      { onConflict: 'user_id' },
    );
    onComplete(
      {
        current_major: finalCurrentMajor,
        target_major: finalTargetName,
        target_major_seq: finalTargetSeq,
        grade: parseInt(grade),
      },
      pdfResult,
    );
    setLoading(false);
  };

  const handleLogout = () => supabase.auth.signOut();

  // ── 공용 잉크 핑(pill) CTA 스타일 ──
  const primaryBtn = (enabled) => ({
    width: '100%',
    padding: '12px 24px',
    height: 48,
    borderRadius: 9999,
    fontSize: 15,
    fontWeight: 500,
    letterSpacing: '0.01em',
    background: enabled ? C.primary : C.surfaceStrong,
    color: enabled ? C.onPrimary : C.mutedSoft,
    border: 'none',
    cursor: enabled ? 'pointer' : 'default',
    transition: 'background 0.15s',
  });

  const outlineBtn = {
    width: '100%',
    padding: '10px 20px',
    height: 40,
    borderRadius: 9999,
    fontSize: 14,
    fontWeight: 500,
    background: 'transparent',
    color: C.ink,
    border: `1px solid ${C.hairlineStrong}`,
    cursor: 'pointer',
    letterSpacing: '0.01em',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.canvas,
        fontFamily:
          "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif",
      }}
    >
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes orbDrift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(20px,-15px) scale(1.05)}}
        * { box-sizing: border-box; }
        input::placeholder { color: ${C.mutedSoft}; }
        input:focus { outline: none; border-color: ${C.ink} !important; border-width: 2px !important; }
      `}</style>

      {/* ── 헤더 ── */}
      <div
        style={{
          background: C.canvas,
          height: 64,
          padding: '0 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          borderBottom: `1px solid ${C.hairline}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* 로고 모노그램 */}
          <img
            src={logo}
            alt="Transfer Tomorrow"
            style={{ height: 32, width: 'auto', display: 'block' }}
          />
          <span
            style={{
              fontSize: 18,
              fontWeight: 300,
              color: C.ink,
              letterSpacing: '-0.03em',
            }}
          >
            내일<span style={{ fontWeight: 500 }}>환승</span>
          </span>
          <div style={{ width: 1, height: 14, background: C.hairline }} />
          <span
            style={{
              fontSize: 12,
              color: C.muted,
              letterSpacing: '0.01em',
            }}
          >
            자신과 잘맞는 일을 찾는 것
          </span>
        </div>
        <button
          onClick={handleLogout}
          style={{
            fontSize: 13,
            padding: '8px 16px',
            height: 36,
            border: `1px solid ${C.hairlineStrong}`,
            borderRadius: 9999,
            cursor: 'pointer',
            background: 'transparent',
            color: C.ink,
            fontWeight: 500,
            letterSpacing: '0.01em',
          }}
        >
          Logout
        </button>
      </div>

      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          padding: '48px 24px 80px',
          position: 'relative',
        }}
      >
        {/* 배경 그라디언트 오브 — 페이지 전체 */}
        <div
          style={{
            position: 'absolute',
            top: '5%',
            right: '-20%',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${C.gMint}25 0%, rgba(167,229,211,0) 70%)`,
            filter: 'blur(40px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            left: '-20%',
            width: 360,
            height: 360,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${C.gLavender}25 0%, rgba(200,184,224,0) 70%)`,
            filter: 'blur(40px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* ── 진행 표시 ── */}
          <div style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              {['기본 정보', 'PDF 분석', '학과 선택'].map((label, i) => (
                <div key={i} style={{ flex: 1 }}>
                  <div
                    style={{
                      height: 2,
                      borderRadius: 1,
                      marginBottom: 10,
                      background: step > i + 1 ? C.ink : C.hairline,
                      overflow: 'hidden',
                    }}
                  >
                    {step === i + 1 && (
                      <div
                        style={{
                          height: '100%',
                          width: '60%',
                          background: C.ink,
                        }}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: step === i + 1 ? C.ink : C.muted,
                      textAlign: 'center',
                      fontWeight: step === i + 1 ? 500 : 400,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ════════ STEP 1: 기본 정보 ════════ */}
          {step === 1 && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              <p
                style={{
                  fontSize: 11,
                  color: C.muted,
                  fontWeight: 600,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  margin: '0 0 14px',
                }}
              >
                Step 01
              </p>
              <h2
                style={{
                  fontSize: 36,
                  fontWeight: 300,
                  color: C.ink,
                  letterSpacing: '-0.03em',
                  margin: '0 0 12px',
                  lineHeight: 1.17,
                }}
              >
                현재 전공을 알려주세요
              </h2>
              <p
                style={{
                  fontSize: 15,
                  color: C.body,
                  margin: '0 0 36px',
                  lineHeight: 1.6,
                  letterSpacing: '0.01em',
                }}
              >
                정확한 갭 분석을 위해 필요해요
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                {MAJORS.map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setCurrentMajor(m);
                      setCustomMajor('');
                    }}
                    style={{
                      padding: '14px 12px',
                      borderRadius: 12,
                      fontSize: 14,
                      cursor: 'pointer',
                      border: `1px solid ${currentMajor === m ? C.ink : C.hairline}`,
                      background: currentMajor === m ? C.ink : C.surface,
                      color: currentMajor === m ? C.onDark : C.ink,
                      fontWeight: currentMajor === m ? 500 : 400,
                      transition: 'all 0.15s',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {m}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentMajor('기타직접입력')}
                  style={{
                    padding: '14px 12px',
                    borderRadius: 12,
                    fontSize: 14,
                    cursor: 'pointer',
                    border: `1px dashed ${currentMajor === '기타직접입력' ? C.ink : C.hairlineStrong}`,
                    background:
                      currentMajor === '기타직접입력'
                        ? C.canvasSoft
                        : 'transparent',
                    color: currentMajor === '기타직접입력' ? C.ink : C.muted,
                    fontWeight: currentMajor === '기타직접입력' ? 500 : 400,
                  }}
                >
                  직접 입력
                </button>
              </div>

              {currentMajor === '기타직접입력' && (
                <input
                  type="text"
                  placeholder="전공명 입력 (예: 항공우주공학)"
                  value={customMajor}
                  onChange={(e) => setCustomMajor(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 8,
                    marginBottom: 16,
                    border: `1px solid ${C.ink}`,
                    fontSize: 15,
                    background: C.surface,
                    height: 44,
                    letterSpacing: '0.01em',
                  }}
                />
              )}

              <div style={{ marginBottom: 36 }}>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: C.ink,
                    letterSpacing: '0.02em',
                    margin: '24px 0 12px',
                  }}
                >
                  현재 학년
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 8,
                  }}
                >
                  {['1', '2', '3', '4'].map((g) => (
                    <button
                      key={g}
                      onClick={() => setGrade(g)}
                      style={{
                        padding: '14px 8px',
                        borderRadius: 12,
                        fontSize: 15,
                        cursor: 'pointer',
                        border: `1px solid ${grade === g ? C.ink : C.hairline}`,
                        background: grade === g ? C.ink : C.surface,
                        color: grade === g ? C.onDark : C.ink,
                        fontWeight: grade === g ? 500 : 400,
                        transition: 'all 0.15s',
                        letterSpacing: '0.01em',
                      }}
                    >
                      {g}학년
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p style={{ color: C.error, fontSize: 13, marginBottom: 12 }}>
                  {error}
                </p>
              )}

              <button
                onClick={handleSaveProfile}
                disabled={!finalCurrentMajor || !grade || loading}
                style={primaryBtn(finalCurrentMajor && grade)}
                onMouseEnter={(e) => {
                  if (finalCurrentMajor && grade && !loading)
                    e.currentTarget.style.background = C.ink;
                }}
                onMouseLeave={(e) => {
                  if (finalCurrentMajor && grade && !loading)
                    e.currentTarget.style.background = C.primary;
                }}
              >
                {loading ? '저장 중...' : '다음 단계'}
              </button>
            </div>
          )}

          {/* ════════ STEP 2: PDF 업로드 ════════ */}
          {step === 2 && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              <p
                style={{
                  fontSize: 11,
                  color: C.muted,
                  fontWeight: 600,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  margin: '0 0 14px',
                }}
              >
                Step 02
              </p>
              <h2
                style={{
                  fontSize: 36,
                  fontWeight: 300,
                  color: C.ink,
                  letterSpacing: '-0.03em',
                  margin: '0 0 12px',
                  lineHeight: 1.17,
                }}
              >
                워크넷 검사 결과를 올려주세요
              </h2>
              <p
                style={{
                  fontSize: 15,
                  color: C.body,
                  margin: '0 0 36px',
                  lineHeight: 1.6,
                  letterSpacing: '0.01em',
                }}
              >
                AI가 흥미유형을 분석해 딱 맞는 학과를 추천해드려요
              </p>

              {/* 검사 유형 선택 */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                {[
                  ['L', 'L형 (정밀)', '흥미 + 성격 + 생활사'],
                  ['S', 'S형 (간단)', '흥미만'],
                ].map(([t, label, desc]) => (
                  <button
                    key={t}
                    onClick={() => setExamType(t)}
                    style={{
                      flex: 1,
                      padding: '16px 18px',
                      borderRadius: 16,
                      cursor: 'pointer',
                      textAlign: 'left',
                      border: `1px solid ${examType === t ? C.ink : C.hairline}`,
                      background: examType === t ? C.canvasSoft : C.surface,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: C.ink,
                        marginBottom: 4,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {label}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted }}>{desc}</div>
                  </button>
                ))}
              </div>

              {/* 파일 선택 — 그라디언트 오브 카드 */}
              <div
                onClick={() => document.getElementById('pdf-input').click()}
                style={{
                  border: `1px ${pdfFile ? 'solid' : 'dashed'} ${pdfFile ? C.ink : C.hairlineStrong}`,
                  borderRadius: 24,
                  padding: 48,
                  textAlign: 'center',
                  background: pdfFile ? C.canvasSoft : C.surface,
                  cursor: 'pointer',
                  marginBottom: 16,
                  transition: 'all 0.15s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* 카드 안 그라디언트 오브 */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-30%',
                    right: '-20%',
                    width: 280,
                    height: 280,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${pdfFile ? C.gMint : C.gSky}50 0%, rgba(168,200,232,0) 70%)`,
                    filter: 'blur(30px)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="pdf-input"
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => setPdfFile(e.target.files[0])}
                />
                <div style={{ position: 'relative' }}>
                  {pdfFile ? (
                    <>
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        style={{ margin: '0 auto 14px', display: 'block' }}
                      >
                        <path
                          d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                          stroke={C.ink}
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M14 2v6h6M9 13l2 2 4-4"
                          stroke={C.ink}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p
                        style={{
                          fontSize: 15,
                          fontWeight: 500,
                          color: C.ink,
                          margin: 0,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {pdfFile.name}
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: C.muted,
                          margin: '6px 0 0',
                          letterSpacing: '0.04em',
                        }}
                      >
                        클릭하면 변경
                      </p>
                    </>
                  ) : (
                    <>
                      <svg
                        width="36"
                        height="36"
                        viewBox="0 0 24 24"
                        fill="none"
                        style={{ margin: '0 auto 16px', display: 'block' }}
                      >
                        <path
                          d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                          stroke={C.ink}
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M14 2v6h6"
                          stroke={C.ink}
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p
                        style={{
                          fontSize: 16,
                          fontWeight: 500,
                          color: C.ink,
                          margin: '0 0 6px',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        PDF 파일 선택
                      </p>
                      <p
                        style={{
                          fontSize: 13,
                          color: C.muted,
                          margin: 0,
                          letterSpacing: '0.01em',
                        }}
                      >
                        워크넷 직업선호도검사 결과지
                      </p>
                    </>
                  )}
                </div>
              </div>

              {pdfError && (
                <p style={{ color: C.error, fontSize: 13, marginBottom: 12 }}>
                  {pdfError}
                </p>
              )}

              {pdfResult && (
                <div
                  style={{
                    padding: '14px 18px',
                    background: C.canvasSoft,
                    border: `1px solid ${C.hairline}`,
                    borderRadius: 12,
                    marginBottom: 16,
                  }}
                >
                  <p style={{ fontSize: 14, color: C.ink, margin: 0 }}>
                    분석 완료 · 홀랜드 코드{' '}
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 500,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {pdfResult.hollandCode}
                    </span>
                    {pdfResult.rawScores && (
                      <span
                        style={{
                          marginLeft: 10,
                          fontSize: 12,
                          color: C.muted,
                          letterSpacing: '0.01em',
                        }}
                      >
                        R:{pdfResult.rawScores.R} I:{pdfResult.rawScores.I} A:
                        {pdfResult.rawScores.A} S:{pdfResult.rawScores.S} E:
                        {pdfResult.rawScores.E} C:{pdfResult.rawScores.C}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {majorLoading && (
                <div
                  style={{
                    padding: '16px 18px',
                    background: C.canvasSoft,
                    border: `1px solid ${C.hairline}`,
                    borderRadius: 12,
                    marginBottom: 16,
                    textAlign: 'center',
                  }}
                >
                  <p
                    style={{
                      fontSize: 13,
                      color: C.ink,
                      fontWeight: 500,
                      margin: '0 0 4px',
                      letterSpacing: '0.01em',
                    }}
                  >
                    커리어넷 데이터로 학과를 분석하는 중...
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: C.muted,
                      margin: 0,
                      letterSpacing: '0.01em',
                    }}
                  >
                    잠시만 기다려주세요 (약 10~15초)
                  </p>
                </div>
              )}

              {recommendedMajors.length > 0 && (
                <div
                  style={{
                    padding: '14px 18px',
                    background: C.canvasSoft,
                    border: `1px solid ${C.hairline}`,
                    borderRadius: 12,
                    marginBottom: 16,
                  }}
                >
                  <p
                    style={{
                      fontSize: 14,
                      color: C.ink,
                      margin: 0,
                      fontWeight: 500,
                      letterSpacing: '0.01em',
                    }}
                  >
                    {recommendedMajors.length}개 학과 추천 완료 · 아래에서
                    선택해주세요
                  </p>
                </div>
              )}

              <button
                onClick={
                  recommendedMajors.length > 0
                    ? () => setStep(3)
                    : handlePdfUpload
                }
                disabled={
                  pdfLoading ||
                  majorLoading ||
                  (!pdfFile && recommendedMajors.length === 0)
                }
                style={{
                  ...primaryBtn(pdfFile || recommendedMajors.length > 0),
                  marginBottom: 10,
                }}
                onMouseEnter={(e) => {
                  if (
                    (pdfFile || recommendedMajors.length > 0) &&
                    !pdfLoading &&
                    !majorLoading
                  )
                    e.currentTarget.style.background = C.ink;
                }}
                onMouseLeave={(e) => {
                  if (
                    (pdfFile || recommendedMajors.length > 0) &&
                    !pdfLoading &&
                    !majorLoading
                  )
                    e.currentTarget.style.background = C.primary;
                }}
              >
                {pdfLoading || majorLoading
                  ? '분석 중...'
                  : recommendedMajors.length > 0
                    ? '학과 선택하러 가기'
                    : '검사 결과 분석하기'}
              </button>

              <button onClick={() => setStep(1)} style={outlineBtn}>
                ← 이전
              </button>
            </div>
          )}

          {/* ════════ STEP 3: 학과 선택 ════════ */}
          {step === 3 && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              <p
                style={{
                  fontSize: 11,
                  color: C.muted,
                  fontWeight: 600,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  margin: '0 0 14px',
                }}
              >
                Step 03
              </p>
              <h2
                style={{
                  fontSize: 32,
                  fontWeight: 300,
                  color: C.ink,
                  letterSpacing: '-0.03em',
                  margin: '0 0 12px',
                  lineHeight: 1.2,
                }}
              >
                홀랜드 코드{' '}
                <span style={{ fontWeight: 500 }}>
                  {pdfResult?.hollandCode}
                </span>{' '}
                맞춤 학과예요
              </h2>
              <p
                style={{
                  fontSize: 15,
                  color: C.body,
                  margin: '0 0 36px',
                  lineHeight: 1.6,
                  letterSpacing: '0.01em',
                }}
              >
                관심 있는 학과를 선택하면 갭 분석을 시작해요
              </p>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                {recommendedMajors.map((maj, i) => {
                  const isSelected = selectedMajor?.seq === maj.seq;
                  const catColor = CATEGORY_COLOR[maj.category] || C.gSky;
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        setSelectedMajor(maj);
                        setShowCustomInput(false);
                      }}
                      style={{
                        border: `1px solid ${isSelected ? C.ink : C.hairline}`,
                        borderRadius: 16,
                        padding: 24,
                        cursor: 'pointer',
                        background: C.surface,
                        transition: 'all 0.15s',
                        boxShadow: isSelected
                          ? '0 4px 16px rgba(0,0,0,0.04)'
                          : 'none',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: 12,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: 11,
                              padding: '3px 10px',
                              borderRadius: 9999,
                              background: `${catColor}40`,
                              color: C.ink,
                              marginBottom: 10,
                              fontWeight: 500,
                              letterSpacing: '0.04em',
                            }}
                          >
                            {maj.category}
                          </span>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 500,
                              color: C.ink,
                              letterSpacing: '-0.01em',
                              marginBottom: 4,
                            }}
                          >
                            {maj.name}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              color: C.muted,
                              fontWeight: 400,
                              letterSpacing: '0.01em',
                            }}
                          >
                            {maj.keyword}
                          </div>
                        </div>
                        <div
                          style={{
                            background: C.canvasSoft,
                            color: C.ink,
                            border: `1px solid ${C.hairline}`,
                            fontSize: 16,
                            fontWeight: 500,
                            padding: '6px 14px',
                            borderRadius: 9999,
                            flexShrink: 0,
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {maj.match}%
                        </div>
                      </div>
                      <p
                        style={{
                          fontSize: 14,
                          color: C.body,
                          margin: '0 0 14px',
                          lineHeight: 1.65,
                          letterSpacing: '0.01em',
                        }}
                      >
                        {maj.reason}
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          gap: 6,
                          flexWrap: 'wrap',
                        }}
                      >
                        {maj.employment && (
                          <span
                            style={{
                              fontSize: 11,
                              color: C.body,
                              background: C.surfaceStrong,
                              padding: '4px 10px',
                              borderRadius: 9999,
                              fontWeight: 500,
                            }}
                          >
                            취업률 {maj.employment}
                          </span>
                        )}
                        {maj.salary && (
                          <span
                            style={{
                              fontSize: 11,
                              color: C.body,
                              background: C.surfaceStrong,
                              padding: '4px 10px',
                              borderRadius: 9999,
                              fontWeight: 500,
                            }}
                          >
                            초봉 {maj.salary}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 11,
                            color: C.muted,
                            background: 'transparent',
                            padding: '4px 0',
                            letterSpacing: '0.01em',
                          }}
                        >
                          {maj.jobs}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* 직접 입력 */}
                <div
                  onClick={() => {
                    setShowCustomInput(true);
                    setSelectedMajor(null);
                  }}
                  style={{
                    border: `1px dashed ${showCustomInput ? C.ink : C.hairlineStrong}`,
                    borderRadius: 16,
                    padding: 20,
                    cursor: 'pointer',
                    background: showCustomInput ? C.canvasSoft : 'transparent',
                    textAlign: 'center',
                  }}
                >
                  <p
                    style={{
                      fontSize: 14,
                      color: showCustomInput ? C.ink : C.muted,
                      margin: 0,
                      fontWeight: showCustomInput ? 500 : 400,
                      letterSpacing: '0.01em',
                    }}
                  >
                    원하는 학과가 없어요 — 직접 입력할게요
                  </p>
                </div>
              </div>

              {showCustomInput && (
                <input
                  type="text"
                  placeholder="학과명 직접 입력 (예: 도시공학과, 철학과)"
                  value={customMajorInput}
                  onChange={(e) => setCustomMajorInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 8,
                    marginBottom: 12,
                    border: `1px solid ${C.ink}`,
                    fontSize: 15,
                    background: C.surface,
                    height: 44,
                    letterSpacing: '0.01em',
                  }}
                />
              )}

              <button
                onClick={handleComplete}
                disabled={(!selectedMajor && !customMajorInput) || loading}
                style={{
                  ...primaryBtn(selectedMajor || customMajorInput),
                  marginBottom: 10,
                }}
                onMouseEnter={(e) => {
                  if ((selectedMajor || customMajorInput) && !loading)
                    e.currentTarget.style.background = C.ink;
                }}
                onMouseLeave={(e) => {
                  if ((selectedMajor || customMajorInput) && !loading)
                    e.currentTarget.style.background = C.primary;
                }}
              >
                {loading ? '분석 시작 중...' : '이 학과로 갭 분석 시작'}
              </button>

              <button onClick={() => setStep(2)} style={outlineBtn}>
                ← 이전
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
