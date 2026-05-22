<?php

namespace App\Http\Controllers;

use App\Models\PriceListItem;
use App\Models\PriceListItemQuestion;
use App\Models\QuestionAnswer;
use App\Models\AnswerCondition;
use Illuminate\Http\Request;

class PriceListQuestionController extends Controller
{
    /**
     * Lista domande per listino
     */
    public function index($priceListItemId)
    {
        $priceListItem = PriceListItem::findOrFail($priceListItemId);
        $questions = $priceListItem->questions()->with(['answers.conditions'])->get();

        return response()->json($questions);
    }

    /**
     * Crea nuova domanda
     */
    public function store(Request $request, $priceListItemId)
    {
        $priceListItem = PriceListItem::findOrFail($priceListItemId);

        $validated = $request->validate([
            'question_text' => 'required|string',
            'question_type' => 'required|in:multiple_choice,text,number',
            'is_required' => 'boolean',
            'order' => 'integer',
        ]);

        $question = $priceListItem->questions()->create($validated);
        $question->load(['answers.conditions']);

        return response()->json($question, 201);
    }

    /**
     * Modifica domanda
     */
    public function update(Request $request, $priceListItemId, $questionId)
    {
        $question = PriceListItemQuestion::where('price_list_item_id', $priceListItemId)
            ->findOrFail($questionId);

        $validated = $request->validate([
            'question_text' => 'sometimes|required|string',
            'question_type' => 'sometimes|required|in:multiple_choice,text,number',
            'is_required' => 'boolean',
            'order' => 'integer',
        ]);

        $question->update($validated);
        $question->load(['answers.conditions']);

        return response()->json($question);
    }

    /**
     * Elimina domanda
     */
    public function destroy($priceListItemId, $questionId)
    {
        $question = PriceListItemQuestion::where('price_list_item_id', $priceListItemId)
            ->findOrFail($questionId);

        $question->delete();

        return response()->json(['message' => 'Domanda eliminata con successo']);
    }

    /**
     * Aggiungi risposta a domanda multiple choice
     */
    public function addAnswer(Request $request, $priceListItemId, $questionId)
    {
        // Verifica che la domanda appartenga al listino
        $question = PriceListItemQuestion::where('price_list_item_id', $priceListItemId)
            ->findOrFail($questionId);

        if ($question->question_type !== 'multiple_choice') {
            return response()->json(['error' => 'Solo domande multiple choice possono avere risposte predefinite'], 400);
        }

        $validated = $request->validate([
            'answer_text' => 'required|string|max:255',
            'order' => 'integer',
        ]);

        $answer = $question->answers()->create($validated);
        $answer->load('conditions');

        return response()->json($answer, 201);
    }

    /**
     * Modifica risposta
     */
    public function updateAnswer(Request $request, $answerId)
    {
        $answer = QuestionAnswer::findOrFail($answerId);

        $validated = $request->validate([
            'answer_text' => 'sometimes|required|string|max:255',
            'order' => 'integer',
        ]);

        $answer->update($validated);
        $answer->load('conditions');

        return response()->json($answer);
    }

    /**
     * Elimina risposta
     */
    public function deleteAnswer($answerId)
    {
        $answer = QuestionAnswer::findOrFail($answerId);
        $answer->delete();

        return response()->json(['message' => 'Risposta eliminata con successo']);
    }

    /**
     * Aggiungi condizione a risposta
     */
    public function addCondition(Request $request, $answerId)
    {
        $answer = QuestionAnswer::findOrFail($answerId);

        $validated = $request->validate([
            'price_adjustment' => 'required|numeric',
            'cost_description' => 'nullable|string',
            'cost_amount' => 'nullable|numeric|min:0',
            'work_description' => 'nullable|string',
        ]);

        $condition = $answer->conditions()->create($validated);

        return response()->json($condition, 201);
    }

    /**
     * Modifica condizione
     */
    public function updateCondition(Request $request, $conditionId)
    {
        $condition = AnswerCondition::findOrFail($conditionId);

        $validated = $request->validate([
            'price_adjustment' => 'sometimes|required|numeric',
            'cost_description' => 'nullable|string',
            'cost_amount' => 'nullable|numeric|min:0',
            'work_description' => 'nullable|string',
        ]);

        $condition->update($validated);

        return response()->json($condition);
    }

    /**
     * Elimina condizione
     */
    public function deleteCondition($conditionId)
    {
        $condition = AnswerCondition::findOrFail($conditionId);
        $condition->delete();

        return response()->json(['message' => 'Condizione eliminata con successo']);
    }
}

