import React, { useState, useContext } from 'react';
import { FinanceContext } from '../../context/FinanceContext';
import { Award, Info, Compass } from 'lucide-react';
import { formatBRL } from '../../utils/financeUtils';

const InvestmentPlanner = ({ investmentGoal, setInvestmentGoal }) => {
  const { profile, setProfile } = useContext(FinanceContext);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoalTarget, setTempGoalTarget] = useState(investmentGoal.target);

  // Quiz states
  const [quizScore, setQuizScore] = useState(0);
  const [quizQuestionIdx, setQuizQuestionIdx] = useState(0);

  const quizQuestions = [
    {
      q: 'Qual o seu objetivo principal ao investir?',
      options: [
        { text: 'Preservar meu dinheiro de perdas e ter liquidez imediata.', score: 1 },
        { text: 'Diversificar para bater a poupança e aceitar pequenas flutuações.', score: 3 },
        { text: 'Maximizar meus lucros no longo prazo, mesmo com risco de quedas.', score: 5 }
      ]
    },
    {
      q: 'O que você faria se sua carteira de investimentos caísse 15% de repente?',
      options: [
        { text: 'Resgataria todo o dinheiro imediatamente para evitar mais perdas.', score: 1 },
        { text: 'Manteria os investimentos e aguardaria a recuperação natural.', score: 3 },
        { text: 'Compraria mais ativos aproveitando o preço promocional (desconto).', score: 5 }
      ]
    }
  ];

  const handleQuizAnswer = (score) => {
    const nextIdx = quizQuestionIdx + 1;
    const newScore = quizScore + score;
    setQuizScore(newScore);

    if (nextIdx < quizQuestions.length) {
      setQuizQuestionIdx(nextIdx);
    } else {
      // Determine profile
      if (newScore <= 4) setProfile('Conservador');
      else if (newScore <= 7) setProfile('Moderado');
      else setProfile('Arrojado');
    }
  };

  const handleResetQuiz = () => {
    setProfile('');
    setQuizScore(0);
    setQuizQuestionIdx(0);
  };

  const handleSaveGoal = () => {
    setInvestmentGoal(prev => ({
      ...prev,
      target: parseFloat(tempGoalTarget)
    }));
    setIsEditingGoal(false);
  };

  const goalPercent = investmentGoal.target > 0
    ? (investmentGoal.current / investmentGoal.target) * 100
    : 0;

  return (
    <div className="planner-grid animate-fade-in">
      {/* Emergency Reserve Progress Card */}
      <div className="card details-card">
        <div className="flex-between flex-center-y mb-md">
          <h3>Progresso da Reserva de Emergência</h3>
          <button 
            className="btn btn-sm btn-secondary" 
            onClick={() => {
              if (isEditingGoal) handleSaveGoal();
              else setIsEditingGoal(true);
            }}
          >
            {isEditingGoal ? 'Salvar' : 'Editar Meta'}
          </button>
        </div>
        
        <div className="goal-meter-container">
          <div className="flex-between text-xs mb-sm">
            <span>Disponível em Caixa: {formatBRL(investmentGoal.current)}</span>
            {isEditingGoal ? (
              <div className="flex-center-y">
                <span style={{ marginRight: 4 }}>Meta: R$</span>
                <input 
                  type="number" 
                  style={{ width: 100, padding: '2px 6px', borderRadius: 4 }}
                  value={tempGoalTarget}
                  onChange={(e) => setTempGoalTarget(e.target.value)}
                />
              </div>
            ) : (
              <span>Meta Consolidada: {formatBRL(investmentGoal.target)}</span>
            )}
          </div>
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill bg-success" 
              style={{ width: `${Math.min(goalPercent, 100)}%` }}
            ></div>
          </div>
          <span className="goal-percent text-xs text-secondary mt-xs block">
            {goalPercent.toFixed(0)}% da meta atingida
          </span>
        </div>

        <div className="alert-message success-alert mt-lg flex-center-y">
          <Info className="text-success flex-shrink-0" size={18} style={{ marginRight: 8 }} />
          <span className="text-xs">
            Sua reserva está aplicada em ativos de liquidez imediata (Nubank Selic). O recomendado para o seu perfil é ter 6 meses de custo fixo familiar reservado.
          </span>
        </div>
      </div>

      {/* Investment Profile Quiz */}
      <div className="card details-card">
        <h3>Descubra seu Perfil de Investidor</h3>
        {!profile ? (
          <div className="quiz-content mt-md">
            <p className="question-title font-semibold mb-sm">
              Questão {quizQuestionIdx + 1}: {quizQuestions[quizQuestionIdx].q}
            </p>
            <div className="quiz-options-list flex-column gap-sm">
              {quizQuestions[quizQuestionIdx].options.map((opt, i) => (
                <button
                  key={i}
                  className="quiz-option-btn card text-left text-sm"
                  onClick={() => handleQuizAnswer(opt.score)}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="quiz-result mt-md text-center flex-column flex-center animate-scale-up">
            <Award className="text-success" size={48} style={{ marginBottom: 12 }} />
            <h4>Seu perfil é: <span className="text-success font-bold">{profile}</span></h4>
            <p className="card-subtext mt-xs mb-lg">
              {profile === 'Conservador' && 'Você prioriza segurança e liquidez. Recomendamos focar em Tesouro Direto, CDBs pós-fixados e fundos de renda fixa D+0.'}
              {profile === 'Moderado' && 'Você busca equilíbrio entre segurança e rentabilidade. Recomendamos um mix de Renda Fixa com FIIs e uma pequena parcela de ações defensivas.'}
              {profile === 'Arrojado' && 'Você aceita volatilidade para buscar maiores lucros. Recomendamos montar uma carteira focada em ações, fundos multimercados agressivos e ativos de crescimento.'}
            </p>
            <button className="btn btn-secondary btn-sm" onClick={handleResetQuiz}>
              Refazer Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestmentPlanner;
