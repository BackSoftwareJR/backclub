@extends('emails.layouts.main')

@section('content')
    <h1>{{ $status === 'approved' ? '✅ Richiesta Eliminazione Approvata' : '❌ Richiesta Eliminazione Rifiutata' }}</h1>
    
    <p>Ciao <strong>{{ $request->user->name }}</strong>,</p>
    
    <p>
        @if($status === 'approved')
            La tua richiesta di eliminazione per la task <strong>{{ $request->task->title }}</strong> è stata <strong style="color: #34C759;">approvata</strong>.
            La task è stata cancellata.
        @else
            La tua richiesta di eliminazione per la task <strong>{{ $request->task->title }}</strong> è stata <strong style="color: #FF3B30;">rifiutata</strong>.
        @endif
    </p>
    
    <table class="data-table">
        <tr>
            <td class="data-label">Progetto</td>
            <td class="data-value">{{ $request->task->project->name ?? 'N/A' }}</td>
        </tr>
        <tr>
            <td class="data-label">Motivo Richiesta</td>
            <td class="data-value">{{ $request->reason }}</td>
        </tr>
        <tr>
            <td class="data-label">Revisore</td>
            <td class="data-value">{{ $reviewer->name ?? 'Admin' }}</td>
        </tr>
        <tr>
            <td class="data-label">Data Revisione</td>
            <td class="data-value">{{ \Carbon\Carbon::parse($request->reviewed_at)->format('d/m/Y H:i') }}</td>
        </tr>
    </table>

    @if($request->review_notes)
        <p style="font-size: 14px; color: #86868b; margin-bottom: 5px; margin-top: 20px;">Note del Revisore</p>
        <p style="background-color: #f5f5f7; padding: 15px; border-radius: 12px; font-size: 14px; margin-bottom: 30px;">
            {{ $request->review_notes }}
        </p>
    @endif

    @if($status === 'rejected')
        <div style="text-align: center; margin-top: 30px;">
            <a href="{{ config('app.frontend_url', 'https://backclub.it') }}/freelance/task/{{ $request->task->id }}" class="button">
                Vedi Task
            </a>
        </div>
    @endif
@endsection
