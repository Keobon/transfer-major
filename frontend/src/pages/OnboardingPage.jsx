import { useState } from 'react';
import { supabase } from '../supabase';

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

const CATEGORY_COLOR = {
  공학계열: '#3b82f6',
  자연계열: '#10b981',
  사회계열: '#f59e0b',
  인문계열: '#8b5cf6',
  교육계열: '#ec4899',
  예체능계열: '#f97316',
  의약계열: '#ef4444',
};

// ── 디자인 토큰 ─────────────────────────────────
const C = {
  green: '#1A3A2F',
  greenMid: '#2D5A45',
  cream: '#F5F2EC',
  gold: '#B8975A',
  border: '#E0DAD0',
  text: '#1A1A1A',
  textSub: '#5C5C5C',
  textMuted: '#9A9A9A',
  surface: '#FFFFFF',
  danger: '#8B3A3A',
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

  // ── 로직 원본 유지 ──────────────────────────────
  const handleSaveProfile = async () => {
    if (!finalCurrentMajor || !grade) {
      setError('모든 항목을 선택해주세요');
      return;
    }
    setLoading(true);
    setError('');
    const { error: e } = await supabase
      .from('profiles')
      .upsert(
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
    await supabase
      .from('profiles')
      .upsert(
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

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.cream,
        fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif",
      }}
    >
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        input::placeholder { color: #B0ABA4; }
        input:focus { outline: none; border-color: ${C.green} !important; box-shadow: 0 0 0 3px #1A3A2F15; }
      `}</style>

      {/* ── 헤더 ───────────────────────────────── */}
      <div
        style={{
          background: C.green,
          height: 56,
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 8px,${C.greenMid}25 8px,${C.greenMid}25 9px)`,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: C.cream,
              letterSpacing: '-0.02em',
            }}
          >
            내일
          </span>
          <span
            style={{
              fontSize: 15,
              fontWeight: 300,
              color: C.gold,
              letterSpacing: '0.1em',
            }}
          >
            환승
          </span>
          <div
            style={{
              width: 1,
              height: 14,
              background: `${C.cream}25`,
              margin: '0 4px',
            }}
          />
          <span
            style={{
              fontSize: 10,
              color: `${C.cream}60`,
              letterSpacing: '0.03em',
            }}
          >
            자신과 잘맞는 일을 찾는 것
          </span>
        </div>
        <button
          onClick={handleLogout}
          style={{
            position: 'relative',
            fontSize: 10,
            padding: '6px 14px',
            border: `1px solid ${C.cream}25`,
            borderRadius: 6,
            cursor: 'pointer',
            background: 'transparent',
            color: `${C.cream}70`,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Logout
        </button>
      </div>

      <div
        style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 60px' }}
      >
        {/* ── 진행 바 ───────────────────────────── */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {['기본 정보', 'PDF 분석', '학과 선택'].map((label, i) => (
              <div key={i} style={{ flex: 1 }}>
                <div
                  style={{
                    height: 3,
                    borderRadius: 2,
                    marginBottom: 8,
                    overflow: 'hidden',
                    background:
                      step > i + 1
                        ? C.green
                        : step === i + 1
                          ? C.border
                          : C.border,
                  }}
                >
                  {step >= i + 1 && (
                    <div
                      style={{
                        height: '100%',
                        width: step > i + 1 ? '100%' : '60%',
                        background: step > i + 1 ? C.green : C.gold,
                        borderRadius: 2,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  )}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: step === i + 1 ? C.green : C.textMuted,
                    textAlign: 'center',
                    fontWeight: step === i + 1 ? 700 : 400,
                    letterSpacing: '0.06em',
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
                fontSize: 10,
                color: C.gold,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                margin: '0 0 10px',
              }}
            >
              Step 01
            </p>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: C.text,
                letterSpacing: '-0.02em',
                margin: '0 0 6px',
              }}
            >
              현재 전공을 알려주세요
            </h2>
            <p
              style={{
                fontSize: 13,
                color: C.textSub,
                margin: '0 0 28px',
                lineHeight: 1.6,
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
                    padding: '12px 8px',
                    borderRadius: 8,
                    fontSize: 13,
                    cursor: 'pointer',
                    border: `1.5px solid ${currentMajor === m ? C.green : C.border}`,
                    background: currentMajor === m ? `${C.green}08` : C.surface,
                    color: currentMajor === m ? C.green : C.textSub,
                    fontWeight: currentMajor === m ? 700 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {m}
                </button>
              ))}
              <button
                onClick={() => setCurrentMajor('기타직접입력')}
                style={{
                  padding: '12px 8px',
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: 'pointer',
                  border: `1.5px dashed ${currentMajor === '기타직접입력' ? C.green : C.border}`,
                  background:
                    currentMajor === '기타직접입력'
                      ? `${C.green}08`
                      : '#FAFAF8',
                  color:
                    currentMajor === '기타직접입력' ? C.green : C.textMuted,
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
                  border: `1.5px solid ${C.green}`,
                  fontSize: 14,
                  background: C.surface,
                }}
              />
            )}

            <div style={{ marginBottom: 28 }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: C.green,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  margin: '0 0 12px',
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
                      borderRadius: 8,
                      fontSize: 15,
                      cursor: 'pointer',
                      border: `1.5px solid ${grade === g ? C.green : C.border}`,
                      background: grade === g ? C.green : C.surface,
                      color: grade === g ? C.cream : C.textSub,
                      fontWeight: grade === g ? 700 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    {g}학년
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p style={{ color: C.danger, fontSize: 12, marginBottom: 12 }}>
                {error}
              </p>
            )}

            <button
              onClick={handleSaveProfile}
              disabled={!finalCurrentMajor || !grade || loading}
              style={{
                width: '100%',
                padding: 15,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: finalCurrentMajor && grade ? C.green : C.border,
                color: finalCurrentMajor && grade ? C.cream : C.textMuted,
                border: 'none',
                cursor: finalCurrentMajor && grade ? 'pointer' : 'default',
                boxShadow:
                  finalCurrentMajor && grade
                    ? `0 4px 16px ${C.green}30`
                    : 'none',
                transition: 'all 0.15s',
              }}
            >
              {loading ? '저장 중...' : '다음 단계 →'}
            </button>
          </div>
        )}

        {/* ════════ STEP 2: PDF 업로드 ════════ */}
        {step === 2 && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <p
              style={{
                fontSize: 10,
                color: C.gold,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                margin: '0 0 10px',
              }}
            >
              Step 02
            </p>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: C.text,
                letterSpacing: '-0.02em',
                margin: '0 0 6px',
              }}
            >
              워크넷 검사 결과를 올려주세요
            </h2>
            <p
              style={{
                fontSize: 13,
                color: C.textSub,
                margin: '0 0 28px',
                lineHeight: 1.6,
              }}
            >
              AI가 흥미유형을 분석해 딱 맞는 학과를 추천해드려요
            </p>

            {/* 검사 유형 선택 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[
                ['L', 'L형 (정밀)', '흥미 + 성격 + 생활사'],
                ['S', 'S형 (간단)', '흥미만'],
              ].map(([t, label, desc]) => (
                <button
                  key={t}
                  onClick={() => setExamType(t)}
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    textAlign: 'left',
                    border: `1.5px solid ${examType === t ? C.green : C.border}`,
                    background: examType === t ? `${C.green}06` : C.surface,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: examType === t ? C.green : C.text,
                      marginBottom: 3,
                    }}
                  >
                    {label}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{desc}</div>
                </button>
              ))}
            </div>

            {/* 파일 선택 */}
            <div
              onClick={() => document.getElementById('pdf-input').click()}
              style={{
                border: `2px dashed ${pdfFile ? C.green : C.border}`,
                borderRadius: 14,
                padding: 40,
                textAlign: 'center',
                background: pdfFile ? `${C.green}05` : '#FAFAF8',
                cursor: 'pointer',
                marginBottom: 16,
                transition: 'all 0.15s',
              }}
            >
              <input
                id="pdf-input"
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={(e) => setPdfFile(e.target.files[0])}
              />
              {pdfFile ? (
                <>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: C.green,
                      margin: 0,
                    }}
                  >
                    {pdfFile.name}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: C.textMuted,
                      margin: '4px 0 0',
                      letterSpacing: '0.04em',
                    }}
                  >
                    클릭하면 변경
                  </p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: C.text,
                      margin: '0 0 4px',
                    }}
                  >
                    PDF 파일 선택
                  </p>
                  <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
                    워크넷 직업선호도검사 결과지
                  </p>
                </>
              )}
            </div>

            {pdfError && (
              <p style={{ color: C.danger, fontSize: 12, marginBottom: 12 }}>
                {pdfError}
              </p>
            )}

            {pdfResult && (
              <div
                style={{
                  padding: '12px 16px',
                  background: `${C.greenMid}10`,
                  border: `1px solid ${C.greenMid}30`,
                  borderRadius: 10,
                  marginBottom: 16,
                }}
              >
                <p style={{ fontSize: 13, color: C.greenMid, margin: 0 }}>
                  분석 완료! 홀랜드 코드:{' '}
                  <strong style={{ fontSize: 16 }}>
                    {pdfResult.hollandCode}
                  </strong>
                  {pdfResult.rawScores && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        color: C.textMuted,
                      }}
                    >
                      (R:{pdfResult.rawScores.R} I:{pdfResult.rawScores.I} A:
                      {pdfResult.rawScores.A} S:{pdfResult.rawScores.S} E:
                      {pdfResult.rawScores.E} C:{pdfResult.rawScores.C})
                    </span>
                  )}
                </p>
              </div>
            )}

            {majorLoading && (
              <div
                style={{
                  padding: '14px 16px',
                  background: `${C.gold}10`,
                  border: `1px solid ${C.gold}30`,
                  borderRadius: 10,
                  marginBottom: 16,
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    color: C.gold,
                    fontWeight: 600,
                    margin: '0 0 4px',
                  }}
                >
                  커리어넷 데이터로 학과를 분석하는 중...
                </p>
                <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>
                  잠시만 기다려주세요 (약 10~15초)
                </p>
              </div>
            )}

            {recommendedMajors.length > 0 && (
              <div
                style={{
                  padding: '12px 16px',
                  background: `${C.greenMid}10`,
                  border: `1px solid ${C.greenMid}30`,
                  borderRadius: 10,
                  marginBottom: 16,
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    color: C.greenMid,
                    margin: 0,
                    fontWeight: 600,
                  }}
                >
                  {recommendedMajors.length}개 학과 추천 완료! 아래에서
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
                width: '100%',
                padding: 15,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background:
                  pdfFile || recommendedMajors.length > 0 ? C.green : C.border,
                color:
                  pdfFile || recommendedMajors.length > 0
                    ? C.cream
                    : C.textMuted,
                border: 'none',
                cursor: 'pointer',
                marginBottom: 8,
                boxShadow: pdfFile ? `0 4px 16px ${C.green}30` : 'none',
                transition: 'all 0.15s',
              }}
            >
              {pdfLoading || majorLoading
                ? '분석 중...'
                : recommendedMajors.length > 0
                  ? '학과 선택하러 가기 →'
                  : '검사 결과 분석하기'}
            </button>

            <button
              onClick={() => setStep(1)}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                fontSize: 12,
                border: `1px solid ${C.border}`,
                background: C.surface,
                cursor: 'pointer',
                color: C.textSub,
                letterSpacing: '0.04em',
              }}
            >
              ← 이전
            </button>
          </div>
        )}

        {/* ════════ STEP 3: 학과 선택 ════════ */}
        {step === 3 && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <p
              style={{
                fontSize: 10,
                color: C.gold,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                margin: '0 0 10px',
              }}
            >
              Step 03
            </p>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: C.text,
                letterSpacing: '-0.02em',
                margin: '0 0 6px',
              }}
            >
              홀랜드 코드{' '}
              <span style={{ color: C.green }}>{pdfResult?.hollandCode}</span>{' '}
              맞춤 학과예요
            </h2>
            <p
              style={{
                fontSize: 13,
                color: C.textSub,
                margin: '0 0 28px',
                lineHeight: 1.6,
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
              {recommendedMajors.map((maj, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setSelectedMajor(maj);
                    setShowCustomInput(false);
                  }}
                  style={{
                    border: `1.5px solid ${selectedMajor?.seq === maj.seq ? C.green : C.border}`,
                    borderRadius: 14,
                    padding: 18,
                    cursor: 'pointer',
                    background:
                      selectedMajor?.seq === maj.seq
                        ? `${C.green}05`
                        : C.surface,
                    transition: 'all 0.15s',
                    boxShadow:
                      selectedMajor?.seq === maj.seq
                        ? `0 4px 20px ${C.green}15`
                        : 'none',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: 10,
                          padding: '2px 10px',
                          borderRadius: 4,
                          background: `${CATEGORY_COLOR[maj.category] || '#6366f1'}18`,
                          color: CATEGORY_COLOR[maj.category] || '#6366f1',
                          marginBottom: 6,
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {maj.category}
                      </span>
                      <div
                        style={{
                          fontSize: 17,
                          fontWeight: 700,
                          color: C.text,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {maj.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: C.greenMid,
                          marginTop: 3,
                          fontWeight: 500,
                        }}
                      >
                        {maj.keyword}
                      </div>
                    </div>
                    <div
                      style={{
                        background:
                          maj.match >= 80
                            ? `${C.greenMid}15`
                            : maj.match >= 60
                              ? `${C.gold}15`
                              : `${C.danger}10`,
                        color:
                          maj.match >= 80
                            ? C.greenMid
                            : maj.match >= 60
                              ? C.gold
                              : C.danger,
                        fontSize: 15,
                        fontWeight: 700,
                        padding: '6px 12px',
                        borderRadius: 8,
                        flexShrink: 0,
                      }}
                    >
                      {maj.match}%
                    </div>
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: C.textSub,
                      margin: '0 0 10px',
                      lineHeight: 1.65,
                    }}
                  >
                    {maj.reason}
                  </p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {maj.employment && (
                      <span
                        style={{
                          fontSize: 11,
                          color: C.greenMid,
                          background: `${C.greenMid}10`,
                          padding: '2px 10px',
                          borderRadius: 4,
                        }}
                      >
                        취업률 {maj.employment}
                      </span>
                    )}
                    {maj.salary && (
                      <span
                        style={{
                          fontSize: 11,
                          color: C.gold,
                          background: `${C.gold}15`,
                          padding: '2px 10px',
                          borderRadius: 4,
                        }}
                      >
                        초봉 {maj.salary}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 11,
                        color: '#6366f1',
                        background: '#6366f110',
                        padding: '2px 10px',
                        borderRadius: 4,
                      }}
                    >
                      {maj.jobs}
                    </span>
                  </div>
                </div>
              ))}

              {/* 직접 입력 */}
              <div
                onClick={() => {
                  setShowCustomInput(true);
                  setSelectedMajor(null);
                }}
                style={{
                  border: `1.5px dashed ${showCustomInput ? C.green : C.border}`,
                  borderRadius: 14,
                  padding: 16,
                  cursor: 'pointer',
                  background: showCustomInput ? `${C.green}05` : '#FAFAF8',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    color: showCustomInput ? C.green : C.textMuted,
                    margin: 0,
                    fontWeight: showCustomInput ? 600 : 400,
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
                  border: `1.5px solid ${C.green}`,
                  fontSize: 14,
                  background: C.surface,
                }}
              />
            )}

            <button
              onClick={handleComplete}
              disabled={(!selectedMajor && !customMajorInput) || loading}
              style={{
                width: '100%',
                padding: 15,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background:
                  selectedMajor || customMajorInput ? C.green : C.border,
                color:
                  selectedMajor || customMajorInput ? C.cream : C.textMuted,
                border: 'none',
                cursor:
                  selectedMajor || customMajorInput ? 'pointer' : 'default',
                marginBottom: 8,
                boxShadow:
                  selectedMajor || customMajorInput
                    ? `0 4px 16px ${C.green}30`
                    : 'none',
                transition: 'all 0.15s',
              }}
            >
              {loading ? '분석 시작 중...' : '이 학과로 갭 분석 시작 →'}
            </button>

            <button
              onClick={() => setStep(2)}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 8,
                fontSize: 12,
                border: `1px solid ${C.border}`,
                background: C.surface,
                cursor: 'pointer',
                color: C.textSub,
                letterSpacing: '0.04em',
              }}
            >
              ← 이전
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
